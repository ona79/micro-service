package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.HttpClientsConfig;
import com.uasz.ms_circuit.clients.PatrimoineClient;
import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.Etape;
import com.uasz.ms_circuit.entities.MoyenTransport;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ForbiddenException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.exceptions.ServiceIndisponibleException;
import com.uasz.ms_circuit.exceptions.UnauthorizedException;
import com.uasz.ms_circuit.mappers.CircuitMapper;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import com.uasz.ms_circuit.security.SecurityUserContext;
import com.uasz.ms_circuit.security.SecurityUserContextHolder;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
        SecurityUserContext caller = requirePermission("CIRCUIT:CREER");
        validerDonneesEntreeCircuit(circuitDto);

        Circuit circuit = circuitMapper.toEntity(circuitDto);
        circuit.setId(null);
        normaliserValeursParDefaut(circuit);
        circuit.getEtapes().forEach(etape -> etape.setId(null));

        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit);

        LocalDateTime now = LocalDateTime.now();
        circuit.setCreeParId(caller.userId());
        circuit.setModifieParId(caller.userId());
        circuit.setDateCreation(now);
        circuit.setDateModification(now);

        if (circuit.getStatutCircuit() == StatutCircuit.PUBLIE) {
            validerConditionsPublication(circuit);
            circuit.setValideParId(caller.userId());
            circuit.setDatePublication(now);
        }

        return toDtoEnrichi(circuitRepository.save(circuit), patrimoines);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CircuitDto> getAllCircuits() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean canSeeDrafts = caller != null
                && (caller.hasPermission("CIRCUIT:CREER")
                || caller.hasPermission("CIRCUIT:MODIFIER")
                || caller.hasPermission("CIRCUIT:PUBLIER"));

        return circuitRepository.findAll().stream()
                .filter(c -> {
                    StatutCircuit statut = c.getStatutCircuit() != null ? c.getStatutCircuit() : StatutCircuit.PUBLIE;
                    if (statut == StatutCircuit.ARCHIVE) {
                        return false;
                    }
                    return canSeeDrafts || statut == StatutCircuit.PUBLIE;
                })
                .map(circuitMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<CircuitDto> rechercherCircuits(
            String q,
            Difficulte difficulte,
            MoyenTransport moyenTransport,
            String zone,
            StatutCircuit statut,
            Integer dureeMax,
            Double distanceMax,
            Double prixMax,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isAuthorizedStaff = caller != null
                && (caller.hasPermission("CIRCUIT:CREER")
                || caller.hasPermission("CIRCUIT:MODIFIER")
                || caller.hasPermission("CIRCUIT:PUBLIER")
                || caller.hasPermission("CIRCUIT:ARCHIVER"));

        if ((inclureNonPublies || (statut != null && statut != StatutCircuit.PUBLIE)) && !isAuthorizedStaff) {
            throw new ForbiddenException("Accès interdit : seuls les gestionnaires, guides et administrateurs peuvent consulter les circuits non publiés.");
        }

        String normalizedQ = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedZone = zone != null ? zone.trim().toLowerCase(Locale.ROOT) : "";

        Comparator<Circuit> comparator = buildComparator(sortBy, sortDir);

        List<CircuitDto> filtered = circuitRepository.findAll()
                .stream()
                .filter(c -> {
                    StatutCircuit currentStatut = c.getStatutCircuit() != null ? c.getStatutCircuit() : StatutCircuit.PUBLIE;
                    if (statut != null) {
                        if (currentStatut != statut) return false;
                    } else if (!inclureNonPublies) {
                        if (currentStatut != StatutCircuit.PUBLIE) return false;
                    }
                    if (difficulte != null && c.getDifficulte() != difficulte) {
                        return false;
                    }
                    if (moyenTransport != null && c.getMoyenTransport() != moyenTransport) {
                        return false;
                    }
                    if (!normalizedZone.isEmpty()) {
                        String z = c.getZoneGeographique() != null ? c.getZoneGeographique().toLowerCase(Locale.ROOT) : "";
                        if (!z.contains(normalizedZone)) return false;
                    }
                    if (dureeMax != null && c.getDureeEstimee() > dureeMax) {
                        return false;
                    }
                    if (distanceMax != null && c.getDistanceTotale() > distanceMax) {
                        return false;
                    }
                    if (prixMax != null && c.getPrix() > prixMax) {
                        return false;
                    }
                    if (!normalizedQ.isEmpty()) {
                        String haystack = ((c.getNomCircuit() != null ? c.getNomCircuit() : "") + " "
                                + (c.getDescriptionCircuit() != null ? c.getDescriptionCircuit() : "") + " "
                                + (c.getPresentationTouristique() != null ? c.getPresentationTouristique() : "") + " "
                                + (c.getPointDepart() != null ? c.getPointDepart() : "") + " "
                                + (c.getPointArrivee() != null ? c.getPointArrivee() : "")).toLowerCase(Locale.ROOT);
                        if (!haystack.contains(normalizedQ)) return false;
                    }
                    return true;
                })
                .sorted(comparator)
                .map(circuitMapper::toDto)
                .toList();

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        long totalElements = filtered.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        int fromIndex = Math.min(safePage * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());

        return PageResponseDto.<CircuitDto>builder()
                .content(filtered.subList(fromIndex, toIndex))
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(totalPages == 0 || safePage >= totalPages - 1)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CircuitDto getByIdCircuit(Long id) {
        Circuit circuit = findCircuit(id);
        StatutCircuit statut = circuit.getStatutCircuit() != null ? circuit.getStatutCircuit() : StatutCircuit.PUBLIE;
        if (statut != StatutCircuit.PUBLIE) {
            SecurityUserContext caller = SecurityUserContextHolder.getContext();
            boolean allowed = caller != null && (caller.isServiceCall()
                    || caller.hasPermission("CIRCUIT:CREER")
                    || caller.hasPermission("CIRCUIT:MODIFIER")
                    || caller.hasPermission("CIRCUIT:PUBLIER")
                    || caller.hasPermission("CIRCUIT:ARCHIVER"));
            if (!allowed) {
                throw new ForbiddenException("Ce circuit n'est pas publié ou a été archivé.");
            }
        }

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
        SecurityUserContext caller = requirePermission("CIRCUIT:MODIFIER");
        validerDonneesEntreeCircuit(circuitDto);
        Circuit circuit = findCircuit(id);

        // Contrôle périmétrique (anti-BOLA) pour les guides : un guide ne peut pas modifier un circuit attribué à un autre guide
        if ("GUIDE".equals(caller.role())
                && circuit.getGuideResponsableId() != null
                && !circuit.getGuideResponsableId().equals(caller.userId())) {
            throw new ForbiddenException("Accès interdit : ce circuit est rattaché à un autre guide responsable.");
        }

        circuitMapper.updateEntity(circuitDto, circuit);
        normaliserValeursParDefaut(circuit);

        circuit.getEtapes().clear();
        circuitDto.getEtapes().forEach(etapeDto -> {
            Etape etape = circuitMapper.toEntity(etapeDto);
            etape.setId(null);
            etape.setCircuit(circuit);
            circuit.getEtapes().add(etape);
        });

        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit);
        circuit.setModifieParId(caller.userId());
        circuit.setDateModification(LocalDateTime.now());

        if (circuit.getStatutCircuit() == StatutCircuit.PUBLIE) {
            validerConditionsPublication(circuit);
            if (circuit.getDatePublication() == null) {
                circuit.setDatePublication(LocalDateTime.now());
            }
        }

        return toDtoEnrichi(circuitRepository.save(circuit), patrimoines);
    }

    @Override
    public CircuitDto soumettreCircuit(Long id) {
        SecurityUserContext caller = requireAnyPermission("CIRCUIT:MODIFIER", "CIRCUIT:CREER");
        Circuit circuit = findCircuit(id);
        if ("GUIDE".equals(caller.role())
                && circuit.getGuideResponsableId() != null
                && !circuit.getGuideResponsableId().equals(caller.userId())) {
            throw new ForbiddenException("Accès interdit : ce circuit est rattaché à un autre guide responsable.");
        }
        circuit.setStatutCircuit(StatutCircuit.SOUMIS);
        circuit.setModifieParId(caller.userId());
        circuit.setDateModification(LocalDateTime.now());
        return circuitMapper.toDto(circuitRepository.save(circuit));
    }

    @Override
    public CircuitDto publierCircuit(Long id) {
        SecurityUserContext caller = requireAnyPermission("CIRCUIT:PUBLIER", "CIRCUIT:CREER");
        Circuit circuit = findCircuit(id);
        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit);
        validerConditionsPublication(circuit);

        LocalDateTime now = LocalDateTime.now();
        circuit.setStatutCircuit(StatutCircuit.PUBLIE);
        circuit.setValideParId(caller.userId());
        circuit.setModifieParId(caller.userId());
        circuit.setDatePublication(now);
        circuit.setDateModification(now);
        circuit.setDateArchivage(null);
        return toDtoEnrichi(circuitRepository.save(circuit), patrimoines);
    }

    @Override
    public CircuitDto archiverCircuit(Long id, String motif) {
        SecurityUserContext caller = requireAnyPermission("CIRCUIT:ARCHIVER", "CIRCUIT:SUPPRIMER", "CIRCUIT:CREER");
        Circuit circuit = findCircuit(id);

        LocalDateTime now = LocalDateTime.now();
        circuit.setStatutCircuit(StatutCircuit.ARCHIVE);
        circuit.setModifieParId(caller.userId());
        circuit.setDateArchivage(now);
        circuit.setDateModification(now);
        if (motif != null && !motif.isBlank()) {
            circuit.setMotifStatut(motif.trim());
        }
        return circuitMapper.toDto(circuitRepository.save(circuit));
    }

    @Override
    public void deleteCircuit(Long id) {
        requirePermission("CIRCUIT:SUPPRIMER");
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

    private void validerDonneesEntreeCircuit(CircuitDto dto) {
        if (dto == null) {
            throw new BadRequestException("Les données du circuit sont obligatoires.");
        }
        if (dto.getPlacesMax() < 0) {
            throw new BadRequestException("Le nombre de places maximal ne peut pas être négatif.");
        }
        if (dto.getPrix() < 0) {
            throw new BadRequestException("Le tarif du circuit ne peut pas être négatif.");
        }
        if (dto.getEtapes() == null || dto.getEtapes().isEmpty()) {
            throw new BadRequestException("Un circuit doit comporter au moins une étape.");
        }
        for (EtapeDto etape : dto.getEtapes()) {
            if (etape.getOrdre() <= 0) {
                throw new BadRequestException("L'ordre de chaque étape doit être strictement positif (>= 1).");
            }
            if (etape.getDureeVisite() < 0) {
                throw new BadRequestException("La durée de visite d'une étape ne peut pas être négative.");
            }
            if (etape.getPatrimoineId() == null) {
                throw new BadRequestException("Chaque étape doit référencer un identifiant de patrimoine valide.");
            }
        }
    }

    private void validerConditionsPublication(Circuit circuit) {
        if (circuit.getNomCircuit() == null || circuit.getNomCircuit().trim().isEmpty()) {
            throw new BadRequestException("Publication refusée : le titre du circuit est obligatoire.");
        }
        if (circuit.getEtapes() == null || circuit.getEtapes().isEmpty()) {
            throw new BadRequestException("Publication refusée : un circuit publié doit comporter au moins une étape valide.");
        }
        for (Etape etape : circuit.getEtapes()) {
            if (etape.getDureeVisite() <= 0) {
                throw new BadRequestException("Publication refusée : la durée de visite de l'étape #" + etape.getOrdre() + " doit être strictement positive.");
            }
        }
    }

    private void normaliserValeursParDefaut(Circuit circuit) {
        if (circuit.getMoyenTransport() == null) {
            circuit.setMoyenTransport(MoyenTransport.MIXTE);
        }
        if (circuit.getZoneGeographique() == null || circuit.getZoneGeographique().isBlank()) {
            circuit.setZoneGeographique("BASSE_CASAMANCE");
        }
        if (circuit.getStatutCircuit() == null) {
            circuit.setStatutCircuit(StatutCircuit.PUBLIE);
        }
        if (circuit.getDifficulte() == null) {
            circuit.setDifficulte(Difficulte.FACILE);
        }
    }

    private Comparator<Circuit> buildComparator(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "nom";
        boolean desc = "desc".equalsIgnoreCase(sortDir);

        Comparator<Circuit> comp = switch (field) {
            case "prix" -> Comparator.comparingDouble(Circuit::getPrix);
            case "duree", "dureeestimee" -> Comparator.comparingInt(Circuit::getDureeEstimee);
            case "distance", "distancetotale" -> Comparator.comparingDouble(Circuit::getDistanceTotale);
            case "places", "placesmax" -> Comparator.comparingInt(Circuit::getPlacesMax);
            default -> Comparator.comparing(
                    c -> c.getNomCircuit() != null ? c.getNomCircuit() : "", String.CASE_INSENSITIVE_ORDER);
        };
        return desc ? comp.reversed() : comp;
    }

    private SecurityUserContext requirePermission(String permission) {
        return requireAnyPermission(permission);
    }

    private SecurityUserContext requireAnyPermission(String... permissions) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise pour modifier les circuits.");
        }
        if (caller.isServiceCall()) {
            throw new ForbiddenException("Accès interdit : un appel de service ne peut pas modifier les circuits.");
        }
        for (String perm : permissions) {
            if (caller.hasPermission(perm)) {
                return caller;
            }
        }
        throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role()
                + ") ne possède pas la permission requise (" + String.join(" ou ", permissions) + ").");
    }

    private Circuit findCircuit(Long id) {
        return circuitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Circuit introuvable avec l'id : " + id));
    }

    private Map<Long, PatrimoineDto> preparerCircuit(Circuit circuit) {
        List<Etape> etapes = circuit.getEtapes();

        Set<Integer> ordres = new HashSet<>();
        for (Etape etape : etapes) {
            if (etape.getOrdre() <= 0) {
                throw new BadRequestException("L'ordre d'une étape doit être strictement positif (>= 1).");
            }
            if (!ordres.add(etape.getOrdre())) {
                throw new BadRequestException("L'ordre " + etape.getOrdre() + " est utilisé par plusieurs étapes");
            }
        }
        etapes.sort(Comparator.comparingInt(Etape::getOrdre));

        Map<Long, PatrimoineDto> patrimoines = new HashMap<>();
        for (Etape etape : etapes) {
            PatrimoineDto pat = patrimoines.computeIfAbsent(etape.getPatrimoineId(), this::recupererPatrimoine);
            if ("ARCHIVE".equalsIgnoreCase(pat.getStatutPublication())) {
                throw new BadRequestException("Le patrimoine " + etape.getPatrimoineId()
                        + " est archivé et ne peut pas être associé à un circuit actif.");
            }
        }

        int duree = etapes.stream().mapToInt(Etape::getDureeVisite).sum();
        double distance = 0.0;
        boolean allCoordinatesValid = true;
        for (int i = 1; i < etapes.size(); i++) {
            PatrimoineDto a = patrimoines.get(etapes.get(i - 1).getPatrimoineId());
            PatrimoineDto b = patrimoines.get(etapes.get(i).getPatrimoineId());
            if (hasValidGps(a) && hasValidGps(b)) {
                distance += distanceKm(a.getLatitudePatrimoine(), a.getLongitudePatrimoine(),
                        b.getLatitudePatrimoine(), b.getLongitudePatrimoine());
            } else {
                allCoordinatesValid = false;
            }
        }

        circuit.setDureeEstimee(duree);
        circuit.setDistanceTotale(Math.round(distance * 100.0) / 100.0);
        circuit.setModeCalculDistance(allCoordinatesValid
                ? "ESTIMATION_ORTHODROMIQUE_INDICATIVE"
                : "COORDONNEES_PARTIELLES_INDICATIVE");
        return patrimoines;
    }

    private boolean hasValidGps(PatrimoineDto p) {
        if (p == null) return false;
        float lat = p.getLatitudePatrimoine();
        float lon = p.getLongitudePatrimoine();
        if (Float.isNaN(lat) || Float.isNaN(lon)) return false;
        if (lat == 0.0f && lon == 0.0f) return false;
        return lat >= -90.0f && lat <= 90.0f && lon >= -180.0f && lon <= 180.0f;
    }

    private PatrimoineDto recupererPatrimoine(Long patrimoineId) {
        try {
            return patrimoineClient.getPatrimoineById(patrimoineId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Le patrimoine " + patrimoineId + " n'existe pas dans ms-patrimoine");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-patrimoine pour l'id {}", patrimoineId, ex);
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

    /** Formule de Haversine : distance orthodromique indicative en km entre deux points GPS */
    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RAYON_TERRE_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
