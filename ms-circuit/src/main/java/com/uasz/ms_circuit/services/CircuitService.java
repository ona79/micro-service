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
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CircuitService implements ICircuitService {

    private static final double RAYON_TERRE_KM = 6371.0;
    private static final int MAX_PAGE_SIZE = 50;

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

        if (circuit.getStatutCircuit() == StatutCircuit.PUBLIE && !caller.hasPermission("CIRCUIT:PUBLIER")) {
            throw new ForbiddenException("Accès interdit : la permission CIRCUIT:PUBLIER est requise pour publier directement un circuit.");
        }

        boolean requirePublishedPatrimoines = circuit.getStatutCircuit() == StatutCircuit.PUBLIE
                || circuit.getStatutCircuit() == StatutCircuit.SOUMIS;
        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit, requirePublishedPatrimoines);

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

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Sort sort = buildSafeSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Specification<Circuit> spec = buildSpecification(
                q, difficulte, moyenTransport, zone, statut, dureeMax, distanceMax, prixMax, inclureNonPublies);

        Page<Circuit> dbPage = circuitRepository.findAll(spec, pageable);
        if (dbPage != null) {
            List<CircuitDto> content = dbPage.getContent().stream()
                    .map(circuitMapper::toDto)
                    .toList();
            return PageResponseDto.<CircuitDto>builder()
                    .content(content)
                    .page(dbPage.getNumber())
                    .size(dbPage.getSize())
                    .totalElements(dbPage.getTotalElements())
                    .totalPages(dbPage.getTotalPages())
                    .last(dbPage.isLast())
                    .build();
        }

        return rechercherEnMemoireFallback(
                q, difficulte, moyenTransport, zone, statut, dureeMax, distanceMax, prixMax,
                inclureNonPublies, safePage, safeSize, sortBy, sortDir);
    }

    @Override
    @Transactional(readOnly = true)
    public CircuitDto getByIdCircuit(Long id) {
        Circuit circuit = findCircuit(id);
        StatutCircuit statut = circuit.getStatutCircuit() != null ? circuit.getStatutCircuit() : StatutCircuit.PUBLIE;
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isAuthorizedStaff = caller != null && (caller.isServiceCall()
                || caller.hasPermission("CIRCUIT:CREER")
                || caller.hasPermission("CIRCUIT:MODIFIER")
                || caller.hasPermission("CIRCUIT:PUBLIER")
                || caller.hasPermission("CIRCUIT:ARCHIVER"));

        if (statut != StatutCircuit.PUBLIE && !isAuthorizedStaff) {
            throw new ForbiddenException("Ce circuit n'est pas publié ou a été archivé.");
        }

        Map<Long, PatrimoineDto> patrimoines = new HashMap<>();
        for (Etape etape : circuit.getEtapes()) {
            try {
                PatrimoineDto pat = patrimoines.computeIfAbsent(etape.getPatrimoineId(), patrimoineClient::getPatrimoineById);
                // Ne jamais exposer indirectement un patrimoine BROUILLON, SOUMIS ou ARCHIVE dans une consultation publique
                if (pat != null && pat.getStatutPublication() != null
                        && !"PUBLIE".equalsIgnoreCase(pat.getStatutPublication())
                        && !isAuthorizedStaff) {
                    patrimoines.remove(etape.getPatrimoineId());
                }
            } catch (FeignException.NotFound | FeignException.Forbidden ex) {
                log.warn("Patrimoine {} non accessible ou non publié lors de la lecture du circuit {} : {}",
                        etape.getPatrimoineId(), id, ex.status());
            } catch (FeignException ex) {
                log.error("Service ms-patrimoine indisponible lors de la lecture du circuit {}", id, ex);
                throw new ServiceIndisponibleException("Le service ms-patrimoine est indisponible");
            }
        }
        return toDtoEnrichi(circuit, patrimoines);
    }

    @Override
    public CircuitDto updateCircuit(Long id, CircuitDto circuitDto) {
        SecurityUserContext caller = requirePermission("CIRCUIT:MODIFIER");
        validerDonneesEntreeCircuit(circuitDto);
        Circuit circuit = findCircuit(id);

        // Contrôle BOLA strict sur les données persistées AVANT toute modification (Section 3)
        verifierPerimetreGuide(caller, circuit, circuitDto);

        Long persistedGuideResponsableId = circuit.getGuideResponsableId();
        StatutCircuit previousStatut = circuit.getStatutCircuit();

        circuitMapper.updateEntity(circuitDto, circuit);
        normaliserValeursParDefaut(circuit);

        // Un GUIDE ne peut jamais modifier ni s'approprier guideResponsableId
        if ("GUIDE".equals(caller.role())) {
            circuit.setGuideResponsableId(persistedGuideResponsableId);
        }

        if (circuit.getStatutCircuit() == StatutCircuit.PUBLIE
                && previousStatut != StatutCircuit.PUBLIE
                && !caller.hasPermission("CIRCUIT:PUBLIER")) {
            throw new ForbiddenException("Accès interdit : la permission CIRCUIT:PUBLIER est requise pour publier un circuit.");
        }

        circuit.getEtapes().clear();
        circuitDto.getEtapes().forEach(etapeDto -> {
            Etape etape = circuitMapper.toEntity(etapeDto);
            etape.setId(null);
            etape.setCircuit(circuit);
            circuit.getEtapes().add(etape);
        });

        boolean requirePublishedPatrimoines = circuit.getStatutCircuit() == StatutCircuit.PUBLIE
                || circuit.getStatutCircuit() == StatutCircuit.SOUMIS;
        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit, requirePublishedPatrimoines);
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

        // Contrôle BOLA strict sur le circuit persisté avant soumission (Section 3)
        verifierPerimetreGuide(caller, circuit, null);

        if (circuit.getStatutCircuit() == StatutCircuit.ARCHIVE) {
            throw new BadRequestException("Impossible de soumettre un circuit archivé.");
        }

        preparerCircuit(circuit, true);
        validerConditionsPublication(circuit);

        circuit.setStatutCircuit(StatutCircuit.SOUMIS);
        circuit.setModifieParId(caller.userId());
        circuit.setDateModification(LocalDateTime.now());
        return circuitMapper.toDto(circuitRepository.save(circuit));
    }

    @Override
    public CircuitDto publierCircuit(Long id) {
        SecurityUserContext caller = requirePermission("CIRCUIT:PUBLIER");
        Circuit circuit = findCircuit(id);
        Map<Long, PatrimoineDto> patrimoines = preparerCircuit(circuit, true);
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
        SecurityUserContext caller = requirePermission("CIRCUIT:ARCHIVER");
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
        Optional<Circuit> existingOpt = circuitRepository.findById(id);
        if (existingOpt.isEmpty() && !circuitRepository.existsById(id)) {
            throw new ResourceNotFoundException("Circuit introuvable avec l'id : " + id);
        }
        if (existingOpt.isPresent()) {
            Circuit existing = existingOpt.get();
            if (existing.getStatutCircuit() == StatutCircuit.PUBLIE
                    || existing.getStatutCircuit() == StatutCircuit.SOUMIS) {
                throw new BadRequestException(
                        "Suppression physique refusée : le circuit #" + id
                                + " est publié ou soumis. Pour préserver l'intégrité référentielle et l'historique des réservations, veuillez l'archiver.");
            }
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

    /**
     * Vérifie strictement le périmètre d'un GUIDE sur le circuit persisté avant toute modification (Section 3).
     * - Un circuit sans responsable (guideResponsableId == null) ne peut PAS être modifié ni soumis par un GUIDE.
     * - Un GUIDE ne peut modifier/soumettre que les circuits où guideResponsableId == caller.userId().
     * - Un GUIDE ne peut pas modifier ni réaffecter guideResponsableId.
     */
    private void verifierPerimetreGuide(SecurityUserContext caller, Circuit persistedCircuit, CircuitDto incomingDto) {
        if ("GUIDE".equals(caller.role())) {
            if (persistedCircuit.getGuideResponsableId() == null) {
                throw new ForbiddenException(
                        "Accès interdit : un guide ne peut pas modifier ou soumettre un circuit sans guide responsable affecté.");
            }
            if (!persistedCircuit.getGuideResponsableId().equals(caller.userId())) {
                throw new ForbiddenException(
                        "Accès interdit : ce circuit est rattaché à un autre guide responsable.");
            }
            if (incomingDto != null && incomingDto.getGuideResponsableId() != null
                    && !incomingDto.getGuideResponsableId().equals(persistedCircuit.getGuideResponsableId())) {
                throw new ForbiddenException(
                        "Accès interdit : un guide ne peut pas modifier ou réaffecter le guide responsable d'un circuit.");
            }
        }
    }

    private Specification<Circuit> buildSpecification(
            String q,
            Difficulte difficulte,
            MoyenTransport moyenTransport,
            String zone,
            StatutCircuit statut,
            Integer dureeMax,
            Double distanceMax,
            Double prixMax,
            boolean inclureNonPublies
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statut != null) {
                predicates.add(cb.equal(root.get("statutCircuit"), statut));
            } else if (!inclureNonPublies) {
                predicates.add(cb.equal(root.get("statutCircuit"), StatutCircuit.PUBLIE));
            }
            if (difficulte != null) {
                predicates.add(cb.equal(root.get("difficulte"), difficulte));
            }
            if (moyenTransport != null) {
                predicates.add(cb.equal(root.get("moyenTransport"), moyenTransport));
            }
            if (zone != null && !zone.isBlank()) {
                String pattern = "%" + zone.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.like(cb.lower(cb.coalesce(root.get("zoneGeographique"), "")), pattern));
            }
            if (dureeMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dureeEstimee"), dureeMax));
            }
            if (distanceMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("distanceTotale"), distanceMax));
            }
            if (prixMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("prix"), prixMax));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("nomCircuit"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionCircuit"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("presentationTouristique"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("pointDepart"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("pointArrivee"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSafeSort(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "nom";
        String entityField = switch (field) {
            case "prix" -> "prix";
            case "duree", "dureeestimee" -> "dureeEstimee";
            case "distance", "distancetotale" -> "distanceTotale";
            case "places", "placesmax" -> "placesMax";
            case "date", "datecreation" -> "dateCreation";
            default -> "nomCircuit";
        };
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, entityField);
    }

    private PageResponseDto<CircuitDto> rechercherEnMemoireFallback(
            String q,
            Difficulte difficulte,
            MoyenTransport moyenTransport,
            String zone,
            StatutCircuit statut,
            Integer dureeMax,
            Double distanceMax,
            Double prixMax,
            boolean inclureNonPublies,
            int safePage,
            int safeSize,
            String sortBy,
            String sortDir
    ) {
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
                    if (difficulte != null && c.getDifficulte() != difficulte) return false;
                    if (moyenTransport != null && c.getMoyenTransport() != moyenTransport) return false;
                    if (!normalizedZone.isEmpty()) {
                        String z = c.getZoneGeographique() != null ? c.getZoneGeographique().toLowerCase(Locale.ROOT) : "";
                        if (!z.contains(normalizedZone)) return false;
                    }
                    if (dureeMax != null && c.getDureeEstimee() > dureeMax) return false;
                    if (distanceMax != null && c.getDistanceTotale() > distanceMax) return false;
                    if (prixMax != null && c.getPrix() > prixMax) return false;
                    if (!normalizedQ.isEmpty()) {
                        String haystack = ((c.getNomCircuit() != null ? c.getNomCircuit() : "") + " "
                                + (c.getDescriptionCircuit() != null ? c.getDescriptionCircuit() : "") + " "
                                + (c.getPresentationTouristique() != null ? c.getPresentationTouristique() : "")).toLowerCase(Locale.ROOT);
                        if (!haystack.contains(normalizedQ)) return false;
                    }
                    return true;
                })
                .sorted(comparator)
                .map(circuitMapper::toDto)
                .toList();

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

    private Map<Long, PatrimoineDto> preparerCircuit(Circuit circuit, boolean requirePublishedPatrimoines) {
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
            String statutPat = pat.getStatutPublication() != null ? pat.getStatutPublication().trim().toUpperCase(Locale.ROOT) : "PUBLIE";
            if ("ARCHIVE".equals(statutPat)) {
                throw new BadRequestException("Le patrimoine " + etape.getPatrimoineId()
                        + " est archivé et ne peut pas être associé à un circuit.");
            }
            if (requirePublishedPatrimoines && !"PUBLIE".equals(statutPat)) {
                throw new BadRequestException("Un circuit publié ou soumis ne peut référencer que des patrimoines publiés (le patrimoine "
                        + etape.getPatrimoineId() + " est en statut " + statutPat + ").");
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
        } catch (FeignException.Forbidden ex) {
            throw new BadRequestException("Le patrimoine " + patrimoineId + " n'est pas publié ou n'est pas accessible.");
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
