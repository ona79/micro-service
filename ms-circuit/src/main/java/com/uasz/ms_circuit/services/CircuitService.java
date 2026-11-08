package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.HttpClientsConfig;
import com.uasz.ms_circuit.clients.PatrimoineClient;
import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Etape;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.exceptions.ServiceIndisponibleException;
import com.uasz.ms_circuit.mappers.CircuitMapper;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CircuitService implements ICircuitService {

    private static final double RAYON_TERRE_KM = 6371.0;

    private final CircuitRepository circuitRepository;
    private final CircuitMapper circuitMapper;
    private final PatrimoineClient patrimoineClient;

    @Autowired(required = false)
    private RestTemplate restTemplate;

    @Autowired(required = false)
    private WebClient patrimoineWebClient;

    @Value("${patrimoine.url:http://localhost:3001}")
    private String patrimoineUrl;

    @Override
    public CircuitDto saveCircuit(CircuitDto circuitDto) {
        Circuit circuit = circuitMapper.toEntity(circuitDto);
        circuit.setId(null);
        circuit.getEtapes().forEach(etape -> etape.setId(null));
        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit);
        return toDtoEnrichi(circuitRepository.save(circuit), patrimoines);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CircuitDto> getAllCircuits() {
        // Liste légère : pas d'appel à ms-patrimoine (seuls les patrimoineId sont renvoyés)
        return circuitRepository.findAll().stream()
                .map(circuitMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CircuitDto getByIdCircuit(Long id) {
        Circuit circuit = findCircuit(id);
        // Enrichissement "tolérant" : si ms-patrimoine est indisponible, on renvoie quand même le circuit
        Map<Long, PatrimoineDto> patrimoines = new HashMap<>();
        for (Etape etape : circuit.getEtapes()) {
            try {
                patrimoines.computeIfAbsent(etape.getPatrimoineId(), patrimoineClient::getPatrimoineById);
            } catch (FeignException ex) {
                log.warn("Impossible de récupérer le patrimoine {} : {}", etape.getPatrimoineId(), ex.getMessage());
            }
        }
        return toDtoEnrichi(circuit, patrimoines);
    }

    @Override
    public CircuitDto updateCircuit(Long id, CircuitDto circuitDto) {
        Circuit circuit = findCircuit(id);
        circuitMapper.updateEntity(circuitDto, circuit);

        // Remplacement complet des étapes (orphanRemoval supprime les anciennes)
        circuit.getEtapes().clear();
        circuitDto.getEtapes().forEach(etapeDto -> {
            Etape etape = circuitMapper.toEntity(etapeDto);
            etape.setId(null);
            etape.setCircuit(circuit);
            circuit.getEtapes().add(etape);
        });

        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit);
        return toDtoEnrichi(circuitRepository.save(circuit), patrimoines);
    }

    @Override
    public void deleteCircuit(Long id) {
        if (!circuitRepository.existsById(id)) {
            throw new ResourceNotFoundException("Circuit introuvable avec l'id : " + id);
        }
        circuitRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PatrimoineDto testerCommunication(String mode, Long patrimoineId) {
        return switch (mode.toLowerCase()) {
            case "feign" -> recupererPatrimoine(patrimoineId);
            case "resttemplate" -> HttpClientsConfig.getViaRestTemplate(restTemplate, patrimoineUrl, patrimoineId);
            case "webclient" -> HttpClientsConfig.getViaWebClient(patrimoineWebClient, patrimoineId);
            default -> throw new BadRequestException("Mode inconnu : '" + mode + "'. Valeurs acceptées : feign, resttemplate, webclient");
        };
    }

    // ------------------------------------------------------------------ utilitaires

    private Circuit findCircuit(Long id) {
        return circuitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Circuit introuvable avec l'id : " + id));
    }

    /**
     * Vérifie les étapes (ordre unique, patrimoines existants via OpenFeign),
     * les trie par ordre puis calcule la durée et la distance totales.
     */
    private Map<Long, PatrimoineDto> preparerCircuit(Circuit circuit) {
        List<Etape> etapes = circuit.getEtapes();

        Set<Integer> ordres = new HashSet<>();
        for (Etape etape : etapes) {
            if (!ordres.add(etape.getOrdre())) {
                throw new BadRequestException("L'ordre " + etape.getOrdre() + " est utilisé par plusieurs étapes");
            }
        }
        etapes.sort(Comparator.comparingInt(Etape::getOrdre));

        Map<Long, PatrimoineDto> patrimoines = new HashMap<>();
        for (Etape etape : etapes) {
            patrimoines.computeIfAbsent(etape.getPatrimoineId(), this::recupererPatrimoine);
        }

        int duree = etapes.stream().mapToInt(Etape::getDureeVisite).sum();
        double distance = 0;
        for (int i = 1; i < etapes.size(); i++) {
            PatrimoineDto a = patrimoines.get(etapes.get(i - 1).getPatrimoineId());
            PatrimoineDto b = patrimoines.get(etapes.get(i).getPatrimoineId());
            distance += distanceKm(a.getLatitudePatrimoine(), a.getLongitudePatrimoine(),
                    b.getLatitudePatrimoine(), b.getLongitudePatrimoine());
        }

        circuit.setDureeEstimee(duree);
        circuit.setDistanceTotale(Math.round(distance * 100.0) / 100.0); // arrondi à 2 décimales
        return patrimoines;
    }

    /** Appel OpenFeign vers ms-patrimoine avec traduction des erreurs */
    private PatrimoineDto recupererPatrimoine(Long patrimoineId) {
        try {
            return patrimoineClient.getPatrimoineById(patrimoineId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Le patrimoine " + patrimoineId + " n'existe pas dans ms-patrimoine");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-patrimoine", ex);
            throw new ServiceIndisponibleException("Le service ms-patrimoine est indisponible");
        }
    }

    private CircuitDto toDtoEnrichi(Circuit circuit, Map<Long, PatrimoineDto> patrimoines) {
        CircuitDto dto = circuitMapper.toDto(circuit);
        for (EtapeDto etapeDto : dto.getEtapes()) {
            etapeDto.setPatrimoine(patrimoines.get(etapeDto.getPatrimoineId()));
        }
        return dto;
    }

    /** Distance orthodromique (formule de haversine) en kilomètres */
    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
    }
}

