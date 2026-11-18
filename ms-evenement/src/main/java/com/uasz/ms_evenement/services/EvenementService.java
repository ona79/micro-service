package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.clients.PatrimoineClient;
import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.dto.PatrimoineDto;
import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import com.uasz.ms_evenement.exceptions.BadRequestException;
import com.uasz.ms_evenement.exceptions.ForbiddenException;
import com.uasz.ms_evenement.exceptions.ResourceNotFoundException;
import com.uasz.ms_evenement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_evenement.exceptions.UnauthorizedException;
import com.uasz.ms_evenement.mappers.EvenementMapper;
import com.uasz.ms_evenement.repositories.EvenementRepository;
import com.uasz.ms_evenement.security.SecurityUserContext;
import com.uasz.ms_evenement.security.SecurityUserContextHolder;
import feign.FeignException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EvenementService implements IEvenementService {

    private static final int MAX_PAGE_SIZE = 50;

    private final EvenementRepository evenementRepository;
    private final EvenementMapper evenementMapper;
    private final PatrimoineClient patrimoineClient;

    @Override
    public EvenementDto saveEvenement(EvenementDto evenementDto) {
        SecurityUserContext caller = requirePermission("EVENEMENT:CREER");
        StatutEvenement requestedStatut = (evenementDto != null && evenementDto.getStatutEvenement() != null)
                ? evenementDto.getStatutEvenement()
                : StatutEvenement.PUBLIE;

        if (requestedStatut == StatutEvenement.PUBLIE && !caller.hasPermission("EVENEMENT:PUBLIER")) {
            throw new ForbiddenException("Accès interdit : la permission EVENEMENT:PUBLIER est requise pour publier directement un événement.");
        }

        boolean requirePublishedPatrimoine = requestedStatut == StatutEvenement.PUBLIE
                || requestedStatut == StatutEvenement.SOUMIS;
        PatrimoineDto patrimoine = validerEvenementEtRecupererPatrimoine(evenementDto, requirePublishedPatrimoine);

        Evenement evenement = evenementMapper.toEntity(evenementDto);
        evenement.setId(null);
        normaliserValeursParDefaut(evenement);

        if ((evenement.getLieu() == null || evenement.getLieu().isBlank()) && patrimoine != null) {
            evenement.setLieu(patrimoine.getAdressePatrimoine());
        }

        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        evenement.setCreeParId(caller.userId());
        evenement.setModifieParId(caller.userId());
        evenement.setDateCreation(now);
        evenement.setDateModification(now);

        if (evenement.getStatutEvenement() == StatutEvenement.PUBLIE) {
            validerConditionsPublication(evenement);
            evenement.setValideParId(caller.userId());
            evenement.setDatePublication(now);
        }

        EvenementDto result = evenementMapper.toDto(evenementRepository.save(evenement));
        result.setPatrimoine(patrimoine);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EvenementDto> getAllEvenements() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean canSeeDrafts = caller != null
                && (caller.hasPermission("EVENEMENT:CREER")
                || caller.hasPermission("EVENEMENT:MODIFIER")
                || caller.hasPermission("EVENEMENT:PUBLIER"));

        return evenementRepository.findAll().stream()
                .filter(e -> {
                    StatutEvenement statut = e.getStatutEvenement() != null ? e.getStatutEvenement() : StatutEvenement.PUBLIE;
                    if (statut == StatutEvenement.ARCHIVE) {
                        return false;
                    }
                    if (canSeeDrafts) {
                        return true;
                    }
                    return statut == StatutEvenement.PUBLIE || statut == StatutEvenement.TERMINE;
                })
                .map(evenementMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EvenementDto> getEvenementsAVenir() {
        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        List<Evenement> dbResults = evenementRepository
                .findByStatutEvenementAndDateFinGreaterThanEqualOrderByDateDebutAsc(StatutEvenement.PUBLIE, now);
        if (dbResults != null && !dbResults.isEmpty()) {
            return dbResults.stream().map(evenementMapper::toDto).toList();
        }
        return evenementRepository.findAll().stream()
                .filter(e -> {
                    StatutEvenement statut = e.getStatutEvenement() != null ? e.getStatutEvenement() : StatutEvenement.PUBLIE;
                    if (statut != StatutEvenement.PUBLIE) {
                        return false;
                    }
                    return e.getDateFin() != null && !e.getDateFin().isBefore(now);
                })
                .sorted(Comparator.comparing(
                        e -> e.getDateDebut() != null ? e.getDateDebut() : LocalDateTime.MAX))
                .map(evenementMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<EvenementDto> rechercherEvenements(
            String q,
            TypeEvenement type,
            String zone,
            Long patrimoineId,
            StatutEvenement statut,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            Double prixMax,
            boolean aVenirUniquement,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isAuthorizedStaff = caller != null
                && (caller.hasPermission("EVENEMENT:CREER")
                || caller.hasPermission("EVENEMENT:MODIFIER")
                || caller.hasPermission("EVENEMENT:PUBLIER")
                || caller.hasPermission("EVENEMENT:ANNULER")
                || caller.hasPermission("EVENEMENT:ARCHIVER"));

        if ((inclureNonPublies || (statut != null && statut != StatutEvenement.PUBLIE && statut != StatutEvenement.TERMINE))
                && !isAuthorizedStaff) {
            throw new ForbiddenException("Accès interdit : seuls les gestionnaires et administrateurs peuvent consulter les événements non publiés, annulés ou archivés.");
        }

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Sort sort = buildSafeSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        Specification<Evenement> spec = buildSpecification(
                q, type, zone, patrimoineId, statut, dateMin, dateMax, prixMax, aVenirUniquement, inclureNonPublies, now);

        Page<Evenement> dbPage = evenementRepository.findAll(spec, pageable);
        if (dbPage != null) {
            List<EvenementDto> content = dbPage.getContent().stream()
                    .map(evenementMapper::toDto)
                    .toList();
            return PageResponseDto.<EvenementDto>builder()
                    .content(content)
                    .page(dbPage.getNumber())
                    .size(dbPage.getSize())
                    .totalElements(dbPage.getTotalElements())
                    .totalPages(dbPage.getTotalPages())
                    .last(dbPage.isLast())
                    .build();
        }

        return rechercherEnMemoireFallback(
                q, type, zone, patrimoineId, statut, dateMin, dateMax, prixMax,
                aVenirUniquement, inclureNonPublies, now, safePage, safeSize, sortBy, sortDir);
    }

    @Override
    @Transactional(readOnly = true)
    public EvenementDto getByIdEvenement(Long id) {
        Evenement evenement = findEvenement(id);
        StatutEvenement statut = evenement.getStatutEvenement() != null ? evenement.getStatutEvenement() : StatutEvenement.PUBLIE;
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isAuthorizedStaff = caller != null && (caller.isServiceCall()
                || caller.hasPermission("EVENEMENT:CREER")
                || caller.hasPermission("EVENEMENT:MODIFIER")
                || caller.hasPermission("EVENEMENT:PUBLIER")
                || caller.hasPermission("EVENEMENT:ARCHIVER"));

        if ((statut == StatutEvenement.BROUILLON
                || statut == StatutEvenement.SOUMIS
                || statut == StatutEvenement.ARCHIVE) && !isAuthorizedStaff) {
            throw new ForbiddenException("Cet événement n'est pas publié ou a été archivé.");
        }

        EvenementDto dto = evenementMapper.toDto(evenement);
        if (evenement.getPatrimoineId() != null) {
            try {
                PatrimoineDto pat = patrimoineClient.getPatrimoineById(evenement.getPatrimoineId());
                if (pat != null && pat.getStatutPublication() != null
                        && !"PUBLIE".equalsIgnoreCase(pat.getStatutPublication())
                        && !isAuthorizedStaff) {
                    dto.setPatrimoine(null);
                } else {
                    dto.setPatrimoine(pat);
                }
            } catch (FeignException.NotFound | FeignException.Forbidden ex) {
                log.warn("Patrimoine {} non accessible ou non publié pour l'événement {} : {}",
                        evenement.getPatrimoineId(), id, ex.status());
            } catch (FeignException ex) {
                log.error("Service ms-patrimoine indisponible lors de la lecture de l'événement {}", id, ex);
                throw new ServiceIndisponibleException("Le service ms-patrimoine est indisponible");
            }
        }
        return dto;
    }

    @Override
    public EvenementDto updateEvenement(Long id, EvenementDto evenementDto) {
        SecurityUserContext caller = requirePermission("EVENEMENT:MODIFIER");
        Evenement evenement = findEvenement(id);
        StatutEvenement previousStatut = evenement.getStatutEvenement();
        StatutEvenement targetStatut = (evenementDto != null && evenementDto.getStatutEvenement() != null)
                ? evenementDto.getStatutEvenement()
                : (previousStatut != null ? previousStatut : StatutEvenement.PUBLIE);

        if (targetStatut == StatutEvenement.PUBLIE
                && previousStatut != StatutEvenement.PUBLIE
                && !caller.hasPermission("EVENEMENT:PUBLIER")) {
            throw new ForbiddenException("Accès interdit : la permission EVENEMENT:PUBLIER est requise pour publier un événement.");
        }

        boolean requirePublishedPatrimoine = targetStatut == StatutEvenement.PUBLIE
                || targetStatut == StatutEvenement.SOUMIS;
        PatrimoineDto patrimoine = validerEvenementEtRecupererPatrimoine(evenementDto, requirePublishedPatrimoine);

        evenementMapper.updateEntity(evenementDto, evenement);
        normaliserValeursParDefaut(evenement);
        if ((evenement.getLieu() == null || evenement.getLieu().isBlank()) && patrimoine != null) {
            evenement.setLieu(patrimoine.getAdressePatrimoine());
        }

        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        evenement.setModifieParId(caller.userId());
        evenement.setDateModification(now);

        if (evenement.getStatutEvenement() == StatutEvenement.PUBLIE) {
            validerConditionsPublication(evenement);
            if (evenement.getDatePublication() == null) {
                evenement.setDatePublication(now);
            }
        }

        EvenementDto result = evenementMapper.toDto(evenementRepository.save(evenement));
        result.setPatrimoine(patrimoine);
        return result;
    }

    @Override
    public EvenementDto soumettreEvenement(Long id) {
        SecurityUserContext caller = requireAnyPermission("EVENEMENT:MODIFIER", "EVENEMENT:CREER");
        Evenement evenement = findEvenement(id);
        if (evenement.getStatutEvenement() == StatutEvenement.ARCHIVE) {
            throw new BadRequestException("Impossible de soumettre un événement archivé.");
        }
        validerConditionsPublication(evenement);
        if (evenement.getPatrimoineId() != null) {
            verifierPatrimoineAssocie(evenement.getPatrimoineId(), evenement.getCapaciteMax(), true);
        }

        evenement.setStatutEvenement(StatutEvenement.SOUMIS);
        evenement.setModifieParId(caller.userId());
        evenement.setDateModification(LocalDateTime.now(Evenement.CASAMANCE_ZONE));
        return evenementMapper.toDto(evenementRepository.save(evenement));
    }

    @Override
    public EvenementDto publierEvenement(Long id) {
        SecurityUserContext caller = requirePermission("EVENEMENT:PUBLIER");
        Evenement evenement = findEvenement(id);
        validerConditionsPublication(evenement);

        PatrimoineDto patrimoine = null;
        if (evenement.getPatrimoineId() != null) {
            patrimoine = verifierPatrimoineAssocie(evenement.getPatrimoineId(), evenement.getCapaciteMax(), true);
        }

        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        evenement.setStatutEvenement(StatutEvenement.PUBLIE);
        evenement.setValideParId(caller.userId());
        evenement.setModifieParId(caller.userId());
        evenement.setDatePublication(now);
        evenement.setDateModification(now);
        evenement.setMotifAnnulation(null);

        EvenementDto dto = evenementMapper.toDto(evenementRepository.save(evenement));
        dto.setPatrimoine(patrimoine);
        return dto;
    }

    @Override
    public EvenementDto annulerEvenement(Long id, String motif) {
        SecurityUserContext caller = requirePermission("EVENEMENT:ANNULER");
        Evenement evenement = findEvenement(id);

        LocalDateTime now = LocalDateTime.now(Evenement.CASAMANCE_ZONE);
        evenement.setStatutEvenement(StatutEvenement.ANNULE);
        evenement.setModifieParId(caller.userId());
        evenement.setDateModification(now);
        evenement.setMotifAnnulation(
                (motif != null && !motif.isBlank()) ? motif.trim() : "Événement annulé par le gestionnaire");
        return evenementMapper.toDto(evenementRepository.save(evenement));
    }

    @Override
    public EvenementDto terminerEvenement(Long id) {
        SecurityUserContext caller = requireAnyPermission("EVENEMENT:MODIFIER", "EVENEMENT:CREER");
        Evenement evenement = findEvenement(id);

        evenement.setStatutEvenement(StatutEvenement.TERMINE);
        evenement.setModifieParId(caller.userId());
        evenement.setDateModification(LocalDateTime.now(Evenement.CASAMANCE_ZONE));
        return evenementMapper.toDto(evenementRepository.save(evenement));
    }

    @Override
    public EvenementDto archiverEvenement(Long id, String motif) {
        SecurityUserContext caller = requirePermission("EVENEMENT:ARCHIVER");
        Evenement evenement = findEvenement(id);

        evenement.setStatutEvenement(StatutEvenement.ARCHIVE);
        evenement.setModifieParId(caller.userId());
        evenement.setDateModification(LocalDateTime.now(Evenement.CASAMANCE_ZONE));
        if (motif != null && !motif.isBlank()) {
            evenement.setMotifAnnulation(motif.trim());
        }
        return evenementMapper.toDto(evenementRepository.save(evenement));
    }

    @Override
    public void deleteEvenement(Long id) {
        requirePermission("EVENEMENT:SUPPRIMER");
        Optional<Evenement> existingOpt = evenementRepository.findById(id);
        if (existingOpt.isEmpty() && !evenementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Événement introuvable avec l'id : " + id);
        }
        if (existingOpt.isPresent()) {
            Evenement existing = existingOpt.get();
            if (existing.getStatutEvenement() == StatutEvenement.PUBLIE
                    || existing.getStatutEvenement() == StatutEvenement.SOUMIS
                    || existing.getStatutEvenement() == StatutEvenement.TERMINE) {
                throw new BadRequestException(
                        "Suppression physique refusée : l'événement #" + id
                                + " est publié, soumis ou terminé. Pour préserver l'intégrité référentielle et l'historique, veuillez l'archiver.");
            }
        }
        evenementRepository.deleteById(id);
    }

    private Specification<Evenement> buildSpecification(
            String q,
            TypeEvenement type,
            String zone,
            Long patrimoineId,
            StatutEvenement statut,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            Double prixMax,
            boolean aVenirUniquement,
            boolean inclureNonPublies,
            LocalDateTime now
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (aVenirUniquement) {
                predicates.add(cb.equal(root.get("statutEvenement"), StatutEvenement.PUBLIE));
                predicates.add(cb.greaterThanOrEqualTo(root.get("dateFin"), now));
            } else if (statut != null) {
                predicates.add(cb.equal(root.get("statutEvenement"), statut));
            } else if (!inclureNonPublies) {
                predicates.add(root.get("statutEvenement").in(StatutEvenement.PUBLIE, StatutEvenement.TERMINE));
            }

            if (type != null) {
                predicates.add(cb.equal(root.get("typeEvenement"), type));
            }
            if (patrimoineId != null) {
                predicates.add(cb.equal(root.get("patrimoineId"), patrimoineId));
            }
            if (zone != null && !zone.isBlank()) {
                String pattern = "%" + zone.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("zoneGeographique"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("localite"), "")), pattern)
                ));
            }
            if (dateMin != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dateFin"), dateMin));
            }
            if (dateMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dateDebut"), dateMax));
            }
            if (prixMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("prix"), prixMax));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("nomEvenement"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionEvenement"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("lieu"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("organisateur"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("localite"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSafeSort(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "datedebut";
        String entityField = switch (field) {
            case "nom", "nomevenement" -> "nomEvenement";
            case "prix" -> "prix";
            case "capacite", "capacitemax" -> "capaciteMax";
            case "datecreation" -> "dateCreation";
            default -> "dateDebut";
        };
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, entityField);
    }

    private PageResponseDto<EvenementDto> rechercherEnMemoireFallback(
            String q,
            TypeEvenement type,
            String zone,
            Long patrimoineId,
            StatutEvenement statut,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            Double prixMax,
            boolean aVenirUniquement,
            boolean inclureNonPublies,
            LocalDateTime now,
            int safePage,
            int safeSize,
            String sortBy,
            String sortDir
    ) {
        String normalizedQ = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedZone = zone != null ? zone.trim().toLowerCase(Locale.ROOT) : "";
        Comparator<Evenement> comparator = buildComparator(sortBy, sortDir);

        List<EvenementDto> filtered = evenementRepository.findAll()
                .stream()
                .filter(e -> {
                    StatutEvenement currentStatut = e.getStatutEvenement() != null ? e.getStatutEvenement() : StatutEvenement.PUBLIE;
                    if (aVenirUniquement) {
                        if (currentStatut != StatutEvenement.PUBLIE) return false;
                        if (e.getDateFin() == null || e.getDateFin().isBefore(now)) return false;
                    } else if (statut != null) {
                        if (currentStatut != statut) return false;
                    } else if (!inclureNonPublies) {
                        if (currentStatut != StatutEvenement.PUBLIE && currentStatut != StatutEvenement.TERMINE) return false;
                    }
                    if (type != null && e.getTypeEvenement() != type) return false;
                    if (patrimoineId != null && !patrimoineId.equals(e.getPatrimoineId())) return false;
                    if (!normalizedZone.isEmpty()) {
                        String z = ((e.getZoneGeographique() != null ? e.getZoneGeographique() : "") + " "
                                + (e.getLocalite() != null ? e.getLocalite() : "")).toLowerCase(Locale.ROOT);
                        if (!z.contains(normalizedZone)) return false;
                    }
                    if (dateMin != null && e.getDateFin() != null && e.getDateFin().isBefore(dateMin)) return false;
                    if (dateMax != null && e.getDateDebut() != null && e.getDateDebut().isAfter(dateMax)) return false;
                    if (prixMax != null && e.getPrix() > prixMax) return false;
                    if (!normalizedQ.isEmpty()) {
                        String haystack = ((e.getNomEvenement() != null ? e.getNomEvenement() : "") + " "
                                + (e.getDescriptionEvenement() != null ? e.getDescriptionEvenement() : "") + " "
                                + (e.getLieu() != null ? e.getLieu() : "") + " "
                                + (e.getOrganisateur() != null ? e.getOrganisateur() : "")).toLowerCase(Locale.ROOT);
                        if (!haystack.contains(normalizedQ)) return false;
                    }
                    return true;
                })
                .sorted(comparator)
                .map(evenementMapper::toDto)
                .toList();

        long totalElements = filtered.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        int fromIndex = Math.min(safePage * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());

        return PageResponseDto.<EvenementDto>builder()
                .content(filtered.subList(fromIndex, toIndex))
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(totalPages == 0 || safePage >= totalPages - 1)
                .build();
    }

    private void validerConditionsPublication(Evenement evenement) {
        if (evenement.getNomEvenement() == null || evenement.getNomEvenement().trim().isEmpty()) {
            throw new BadRequestException("Publication refusée : le nom de l'événement est obligatoire.");
        }
        if (evenement.getTypeEvenement() == null) {
            throw new BadRequestException("Publication refusée : la catégorie de l'événement est obligatoire.");
        }
        if (evenement.getDateDebut() == null || evenement.getDateFin() == null) {
            throw new BadRequestException("Publication refusée : les dates de début et de fin sont obligatoires.");
        }
        if (evenement.getDateFin().isBefore(evenement.getDateDebut())) {
            throw new BadRequestException("La date de fin doit être postérieure ou égale à la date de début");
        }
        if (evenement.getCapaciteMax() <= 0) {
            throw new BadRequestException("Publication refusée : la capacité maximale doit être strictement positive.");
        }
        if (evenement.getPatrimoineId() == null && (evenement.getLieu() == null || evenement.getLieu().trim().isEmpty())) {
            throw new BadRequestException("Publication refusée : un lieu explicite ou un site patrimonial associé est obligatoire.");
        }
    }

    private void normaliserValeursParDefaut(Evenement evenement) {
        if (evenement.getZoneGeographique() == null || evenement.getZoneGeographique().isBlank()) {
            evenement.setZoneGeographique("BASSE_CASAMANCE");
        }
        if (evenement.getStatutEvenement() == null) {
            evenement.setStatutEvenement(StatutEvenement.PUBLIE);
        }
        if (evenement.getFuseauHoraire() == null || evenement.getFuseauHoraire().isBlank()) {
            evenement.setFuseauHoraire("Africa/Dakar");
        }
    }

    private Comparator<Evenement> buildComparator(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "datedebut";
        boolean desc = "desc".equalsIgnoreCase(sortDir);

        Comparator<Evenement> comp = switch (field) {
            case "nom", "nomevenement" -> Comparator.comparing(
                    e -> e.getNomEvenement() != null ? e.getNomEvenement() : "", String.CASE_INSENSITIVE_ORDER);
            case "prix" -> Comparator.comparingDouble(Evenement::getPrix);
            case "capacite", "capacitemax" -> Comparator.comparingInt(Evenement::getCapaciteMax);
            default -> Comparator.comparing(
                    e -> e.getDateDebut() != null ? e.getDateDebut() : LocalDateTime.MAX);
        };
        return desc ? comp.reversed() : comp;
    }

    private SecurityUserContext requirePermission(String permission) {
        return requireAnyPermission(permission);
    }

    private SecurityUserContext requireAnyPermission(String... permissions) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise pour modifier les événements.");
        }
        if (caller.isServiceCall()) {
            throw new ForbiddenException("Accès interdit : un appel de service ne peut pas modifier les événements.");
        }
        for (String perm : permissions) {
            if (caller.hasPermission(perm)) {
                return caller;
            }
        }
        throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role()
                + ") ne possède pas la permission requise (" + String.join(" ou ", permissions) + ").");
    }

    private Evenement findEvenement(Long id) {
        return evenementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Événement introuvable avec l'id : " + id));
    }

    private PatrimoineDto validerEvenementEtRecupererPatrimoine(EvenementDto dto, boolean requirePublishedPatrimoine) {
        if (dto == null) {
            throw new BadRequestException("Les données de l'événement sont obligatoires.");
        }
        if (dto.getDateDebut() == null || dto.getDateFin() == null) {
            throw new BadRequestException("Les dates de début et de fin sont obligatoires.");
        }
        if (dto.getDateFin().isBefore(dto.getDateDebut())) {
            throw new BadRequestException("La date de fin doit être postérieure ou égale à la date de début");
        }
        if (dto.getCapaciteMax() <= 0) {
            throw new BadRequestException("La capacité maximale doit être strictement positive.");
        }
        if (dto.getPrix() < 0) {
            throw new BadRequestException("Le tarif de l'événement ne peut pas être négatif.");
        }

        if (dto.getPatrimoineId() == null) {
            if (dto.getLieu() == null || dto.getLieu().trim().isEmpty()) {
                throw new BadRequestException("Un lieu de déroulement ou un site patrimonial associé est obligatoire.");
            }
            return null;
        }

        return verifierPatrimoineAssocie(dto.getPatrimoineId(), dto.getCapaciteMax(), requirePublishedPatrimoine);
    }

    private PatrimoineDto verifierPatrimoineAssocie(Long patrimoineId, int capaciteMax, boolean requirePublishedPatrimoine) {
        PatrimoineDto patrimoine;
        try {
            patrimoine = patrimoineClient.getPatrimoineById(patrimoineId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Le patrimoine " + patrimoineId + " n'existe pas dans ms-patrimoine");
        } catch (FeignException.Forbidden ex) {
            throw new BadRequestException("Le patrimoine " + patrimoineId + " n'est pas publié ou n'est pas accessible.");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-patrimoine", ex);
            throw new ServiceIndisponibleException("Le service ms-patrimoine est indisponible");
        }

        String statutPat = patrimoine.getStatutPublication() != null
                ? patrimoine.getStatutPublication().trim().toUpperCase(Locale.ROOT)
                : "PUBLIE";

        if ("ARCHIVE".equals(statutPat)) {
            throw new BadRequestException("Le site patrimonial " + patrimoineId
                    + " est archivé et ne peut pas accueillir un événement.");
        }
        if (requirePublishedPatrimoine && !"PUBLIE".equals(statutPat)) {
            throw new BadRequestException("Un événement publié ou soumis ne peut référencer qu'un patrimoine publié (le patrimoine "
                    + patrimoineId + " est en statut " + statutPat + ").");
        }
        if (patrimoine.getCapacitePatrimoine() > 0 && capaciteMax > patrimoine.getCapacitePatrimoine()) {
            throw new BadRequestException("La capacité de l'événement (" + capaciteMax
                    + ") dépasse la capacité maximale du site patrimonial (" + patrimoine.getCapacitePatrimoine() + ")");
        }
        return patrimoine;
    }
}
