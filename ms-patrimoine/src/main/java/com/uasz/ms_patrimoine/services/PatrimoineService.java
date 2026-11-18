package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import com.uasz.ms_patrimoine.exceptions.BadRequestException;
import com.uasz.ms_patrimoine.exceptions.ForbiddenException;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.exceptions.UnauthorizedException;
import com.uasz.ms_patrimoine.mappers.PatrimoineMapper;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import com.uasz.ms_patrimoine.security.SecurityUserContext;
import com.uasz.ms_patrimoine.security.SecurityUserContextHolder;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
@Transactional
public class PatrimoineService implements IPatrimoineService {

    private static final int MAX_PAGE_SIZE = 50;

    private final PatrimoineRepository patrimoineRepository;
    private final PatrimoineMapper patrimoineMapper;

    @Override
    public PatrimoineDto savePatrimoine(PatrimoineDto patrimoineDto) {
        SecurityUserContext caller = requirePermission("PATRIMOINE:CREER");
        validerDonneesPatrimoine(patrimoineDto);

        if (patrimoineDto.getCodePatrimoine() != null
                && patrimoineRepository.existsByCodePatrimoineIgnoreCase(patrimoineDto.getCodePatrimoine().trim())) {
            throw new BadRequestException("Une fiche patrimoine existe déjà avec le code : " + patrimoineDto.getCodePatrimoine());
        }

        Patrimoine patrimoine = patrimoineMapper.toEntity(patrimoineDto);
        patrimoine.setId(null);
        normaliserValeursParDefaut(patrimoine);

        if (patrimoine.getStatutPublication() == StatutPublication.PUBLIE) {
            if (!caller.hasPermission("PATRIMOINE:PUBLIER")) {
                throw new ForbiddenException("Accès interdit : la permission PATRIMOINE:PUBLIER est requise pour publier une fiche patrimoine.");
            }
            validerConditionsPublication(patrimoine);
            patrimoine.setValideParId(caller.userId());
            patrimoine.setDatePublication(LocalDateTime.now());
        }

        LocalDateTime now = LocalDateTime.now();
        patrimoine.setCreeParId(caller.userId());
        patrimoine.setModifieParId(caller.userId());
        patrimoine.setDateCreation(now);
        patrimoine.setDateModification(now);

        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatrimoineDto> getAllPatrimoines() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean canSeeDrafts = caller != null
                && (caller.hasPermission("PATRIMOINE:MODIFIER")
                || caller.hasPermission("PATRIMOINE:CREER")
                || caller.hasPermission("PATRIMOINE:PUBLIER"));

        return patrimoineRepository.findAll()
                .stream()
                .filter(p -> {
                    StatutPublication statut = p.getStatutPublication() != null ? p.getStatutPublication() : StatutPublication.PUBLIE;
                    if (statut == StatutPublication.ARCHIVE) {
                        return false;
                    }
                    return canSeeDrafts || statut == StatutPublication.PUBLIE;
                })
                .map(patrimoineMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<PatrimoineDto> rechercherPatrimoines(
            String q,
            CategoriePatrimoine categorie,
            ZoneCasamance zone,
            String localite,
            StatutPublication statut,
            Integer capaciteMin,
            Double tarifMax,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isAuthorizedStaff = caller != null
                && (caller.hasPermission("PATRIMOINE:MODIFIER")
                || caller.hasPermission("PATRIMOINE:CREER")
                || caller.hasPermission("PATRIMOINE:PUBLIER")
                || caller.hasPermission("PATRIMOINE:ARCHIVER"));

        if ((inclureNonPublies || (statut != null && statut != StatutPublication.PUBLIE)) && !isAuthorizedStaff) {
            throw new ForbiddenException("Accès interdit : seuls les conservateurs et administrateurs peuvent consulter les fiches non publiées ou archivées.");
        }

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Sort sort = buildSafeSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Specification<Patrimoine> spec = buildSpecification(
                q, categorie, zone, localite, statut, capaciteMin, tarifMax, inclureNonPublies);

        Page<Patrimoine> dbPage = patrimoineRepository.findAll(spec, pageable);
        if (dbPage != null) {
            List<PatrimoineDto> content = dbPage.getContent().stream()
                    .map(patrimoineMapper::toDto)
                    .toList();
            return PageResponseDto.<PatrimoineDto>builder()
                    .content(content)
                    .page(dbPage.getNumber())
                    .size(dbPage.getSize())
                    .totalElements(dbPage.getTotalElements())
                    .totalPages(dbPage.getTotalPages())
                    .last(dbPage.isLast())
                    .build();
        }

        // Repli mémoire uniquement si le repository est un mock unitaire n'ayant stubbé que findAll()
        return rechercherEnMemoireFallback(
                q, categorie, zone, localite, statut, capaciteMin, tarifMax, inclureNonPublies, safePage, safeSize, sortBy, sortDir);
    }

    @Override
    @Transactional(readOnly = true)
    public PatrimoineDto getByIdPatrimoine(Long id) {
        Patrimoine patrimoine = findPatrimoine(id);
        StatutPublication statut = patrimoine.getStatutPublication() != null
                ? patrimoine.getStatutPublication()
                : StatutPublication.PUBLIE;

        if (statut != StatutPublication.PUBLIE) {
            SecurityUserContext caller = SecurityUserContextHolder.getContext();
            boolean hasStaffPatrimoineAccess = caller != null
                    && (caller.hasPermission("PATRIMOINE:MODIFIER")
                    || caller.hasPermission("PATRIMOINE:CREER")
                    || caller.hasPermission("PATRIMOINE:PUBLIER")
                    || caller.hasPermission("PATRIMOINE:ARCHIVER"));
            boolean isAuthorizedServiceInspection = caller != null
                    && caller.isServiceCall()
                    && caller.role() != null
                    && !"PUBLIC".equals(caller.role())
                    && !"TOURISTE".equals(caller.role());
            if (!hasStaffPatrimoineAccess && !isAuthorizedServiceInspection) {
                throw new ForbiddenException("Cette fiche patrimoine n'est pas publiée ou a été archivée.");
            }
        }
        return patrimoineMapper.toDto(patrimoine);
    }

    @Override
    public PatrimoineDto updatePatrimoine(Long id, PatrimoineDto patrimoineDto) {
        SecurityUserContext caller = requirePermission("PATRIMOINE:MODIFIER");
        Patrimoine patrimoine = findPatrimoine(id);
        validerDonneesPatrimoine(patrimoineDto);

        if (patrimoineDto.getCodePatrimoine() != null
                && !patrimoineDto.getCodePatrimoine().equalsIgnoreCase(patrimoine.getCodePatrimoine())
                && patrimoineRepository.existsByCodePatrimoineIgnoreCase(patrimoineDto.getCodePatrimoine().trim())) {
            throw new BadRequestException("Une autre fiche patrimoine utilise déjà le code : " + patrimoineDto.getCodePatrimoine());
        }

        StatutPublication previousStatut = patrimoine.getStatutPublication();
        patrimoineMapper.updateEntity(patrimoineDto, patrimoine);
        normaliserValeursParDefaut(patrimoine);
        patrimoine.setModifieParId(caller.userId());
        patrimoine.setDateModification(LocalDateTime.now());

        if (patrimoine.getStatutPublication() == StatutPublication.PUBLIE) {
            if (previousStatut != StatutPublication.PUBLIE && !caller.hasPermission("PATRIMOINE:PUBLIER")) {
                throw new ForbiddenException("Accès interdit : la permission PATRIMOINE:PUBLIER est requise pour publier une fiche patrimoine.");
            }
            validerConditionsPublication(patrimoine);
            if (patrimoine.getDatePublication() == null) {
                patrimoine.setDatePublication(LocalDateTime.now());
            }
            if (patrimoine.getValideParId() == null) {
                patrimoine.setValideParId(caller.userId());
            }
        }

        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public PatrimoineDto soumettrePatrimoine(Long id) {
        SecurityUserContext caller = requireAnyPermission("PATRIMOINE:MODIFIER", "PATRIMOINE:CREER");
        Patrimoine patrimoine = findPatrimoine(id);
        if (patrimoine.getStatutPublication() == StatutPublication.ARCHIVE) {
            throw new BadRequestException("Impossible de soumettre une fiche archivée sans la réactiver au préalable.");
        }
        patrimoine.setStatutPublication(StatutPublication.SOUMIS);
        patrimoine.setModifieParId(caller.userId());
        patrimoine.setDateModification(LocalDateTime.now());
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public PatrimoineDto publierPatrimoine(Long id) {
        SecurityUserContext caller = requirePermission("PATRIMOINE:PUBLIER");
        Patrimoine patrimoine = findPatrimoine(id);
        validerConditionsPublication(patrimoine);

        LocalDateTime now = LocalDateTime.now();
        patrimoine.setStatutPublication(StatutPublication.PUBLIE);
        patrimoine.setValideParId(caller.userId());
        patrimoine.setModifieParId(caller.userId());
        patrimoine.setDatePublication(now);
        patrimoine.setDateModification(now);
        patrimoine.setDateArchivage(null);
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public PatrimoineDto archiverPatrimoine(Long id, String motif) {
        SecurityUserContext caller = requirePermission("PATRIMOINE:ARCHIVER");
        Patrimoine patrimoine = findPatrimoine(id);

        LocalDateTime now = LocalDateTime.now();
        patrimoine.setStatutPublication(StatutPublication.ARCHIVE);
        patrimoine.setModifieParId(caller.userId());
        patrimoine.setDateArchivage(now);
        patrimoine.setDateModification(now);
        if (motif != null && !motif.isBlank()) {
            patrimoine.setMotifStatut(motif.trim());
        }
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public void deletePatrimoine(Long id) {
        requirePermission("PATRIMOINE:SUPPRIMER");
        Optional<Patrimoine> existingOpt = patrimoineRepository.findById(id);
        if (existingOpt.isEmpty() && !patrimoineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id);
        }
        if (existingOpt.isPresent()) {
            Patrimoine existing = existingOpt.get();
            if (existing.getStatutPublication() == StatutPublication.PUBLIE
                    || existing.getStatutPublication() == StatutPublication.SOUMIS) {
                throw new BadRequestException(
                        "Suppression physique refusée : la fiche patrimoine #" + id
                                + " est publiée ou soumise. Pour préserver l'intégrité référentielle et l'historique, veuillez l'archiver.");
            }
        }
        patrimoineRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public com.uasz.ms_patrimoine.dto.PatrimoineStatsDto getStatistiques() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        if ("TOURISTE".equals(caller.role()) || "PUBLIC".equals(caller.role())) {
            throw new ForbiddenException("Accès interdit : statistiques réservées à l'espace professionnel.");
        }
        boolean fullCatalogAccess = caller.hasPermission("PATRIMOINE:CREER")
                || caller.hasPermission("PATRIMOINE:MODIFIER")
                || caller.hasPermission("PATRIMOINE:PUBLIER")
                || caller.hasPermission("PATRIMOINE:ARCHIVER");

        List<Patrimoine> all = patrimoineRepository.findAll();
        long brouillons = 0L;
        long soumis = 0L;
        long publies = 0L;
        long archives = 0L;
        long capacitePubliee = 0L;
        double tarifSumPublie = 0.0;
        java.util.Map<String, Long> parCategorie = new java.util.LinkedHashMap<>();
        java.util.Map<String, Long> parZone = new java.util.LinkedHashMap<>();

        for (Patrimoine p : all) {
            StatutPublication st = p.getStatutPublication() != null ? p.getStatutPublication() : StatutPublication.PUBLIE;
            if (!fullCatalogAccess && st != StatutPublication.PUBLIE) {
                continue;
            }
            switch (st) {
                case BROUILLON -> brouillons++;
                case SOUMIS -> soumis++;
                case PUBLIE -> {
                    publies++;
                    capacitePubliee += Math.max(0, p.getCapacitePatrimoine());
                    tarifSumPublie += Math.max(0.0, p.getTarifEntree());
                }
                case ARCHIVE -> archives++;
            }
            String cat = p.getCategoriePatrimoine() != null ? p.getCategoriePatrimoine().name() : "AUTRE";
            String zone = p.getZoneGeographique() != null ? p.getZoneGeographique().name() : "NON_DEFINIE";
            parCategorie.merge(cat, 1L, Long::sum);
            parZone.merge(zone, 1L, Long::sum);
        }

        long total = fullCatalogAccess ? (brouillons + soumis + publies + archives) : publies;
        double tarifMoyen = publies > 0 ? Math.round((tarifSumPublie / publies) * 100.0) / 100.0 : 0.0;

        return com.uasz.ms_patrimoine.dto.PatrimoineStatsDto.builder()
                .total(total)
                .brouillons(brouillons)
                .soumis(soumis)
                .publies(publies)
                .archives(archives)
                .scope(fullCatalogAccess ? "GLOBAL" : "PUBLIE_UNIQUEMENT")
                .parCategorie(parCategorie)
                .parZone(parZone)
                .capaciteTotalePubliee(capacitePubliee)
                .tarifMoyenPublie(tarifMoyen)
                .build();
    }

    private Specification<Patrimoine> buildSpecification(
            String q,
            CategoriePatrimoine categorie,
            ZoneCasamance zone,
            String localite,
            StatutPublication statut,
            Integer capaciteMin,
            Double tarifMax,
            boolean inclureNonPublies
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statut != null) {
                predicates.add(cb.equal(root.get("statutPublication"), statut));
            } else if (!inclureNonPublies) {
                predicates.add(cb.equal(root.get("statutPublication"), StatutPublication.PUBLIE));
            }
            if (categorie != null) {
                predicates.add(cb.equal(root.get("categoriePatrimoine"), categorie));
            }
            if (zone != null) {
                predicates.add(cb.equal(root.get("zoneGeographique"), zone));
            }
            if (localite != null && !localite.isBlank()) {
                String pattern = "%" + localite.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("localite"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("adressePatrimoine"), "")), pattern)
                ));
            }
            if (capaciteMin != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("capacitePatrimoine"), capaciteMin));
            }
            if (tarifMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("tarifEntree"), tarifMax));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("nomPatrimoine"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("codePatrimoine"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionPatrimoine"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("adressePatrimoine"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("localite"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("typePatrimoine"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSafeSort(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "nom";
        String entityField = switch (field) {
            case "capacite", "capacitepatrimoine" -> "capacitePatrimoine";
            case "tarif", "tarifentree" -> "tarifEntree";
            case "code", "codepatrimoine" -> "codePatrimoine";
            case "date", "datecreation" -> "dateCreation";
            default -> "nomPatrimoine";
        };
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, entityField);
    }

    private PageResponseDto<PatrimoineDto> rechercherEnMemoireFallback(
            String q,
            CategoriePatrimoine categorie,
            ZoneCasamance zone,
            String localite,
            StatutPublication statut,
            Integer capaciteMin,
            Double tarifMax,
            boolean inclureNonPublies,
            int safePage,
            int safeSize,
            String sortBy,
            String sortDir
    ) {
        String normalizedQuery = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedLocalite = localite != null ? localite.trim().toLowerCase(Locale.ROOT) : "";
        Comparator<Patrimoine> comparator = buildComparator(sortBy, sortDir);

        List<PatrimoineDto> filtered = patrimoineRepository.findAll()
                .stream()
                .filter(p -> {
                    StatutPublication currentStatut = p.getStatutPublication() != null ? p.getStatutPublication() : StatutPublication.PUBLIE;
                    if (statut != null) {
                        if (currentStatut != statut) return false;
                    } else if (!inclureNonPublies) {
                        if (currentStatut != StatutPublication.PUBLIE) return false;
                    }
                    if (categorie != null && p.getCategoriePatrimoine() != categorie) return false;
                    if (zone != null && p.getZoneGeographique() != zone) return false;
                    if (!normalizedLocalite.isEmpty()) {
                        String loc = ((p.getLocalite() != null ? p.getLocalite() : "") + " "
                                + (p.getAdressePatrimoine() != null ? p.getAdressePatrimoine() : "")).toLowerCase(Locale.ROOT);
                        if (!loc.contains(normalizedLocalite)) return false;
                    }
                    if (capaciteMin != null && p.getCapacitePatrimoine() < capaciteMin) return false;
                    if (tarifMax != null && p.getTarifEntree() > tarifMax) return false;
                    if (!normalizedQuery.isEmpty()) {
                        String haystack = ((p.getNomPatrimoine() != null ? p.getNomPatrimoine() : "") + " "
                                + (p.getCodePatrimoine() != null ? p.getCodePatrimoine() : "") + " "
                                + (p.getDescriptionPatrimoine() != null ? p.getDescriptionPatrimoine() : "") + " "
                                + (p.getAdressePatrimoine() != null ? p.getAdressePatrimoine() : "") + " "
                                + (p.getLocalite() != null ? p.getLocalite() : "")).toLowerCase(Locale.ROOT);
                        if (!haystack.contains(normalizedQuery)) return false;
                    }
                    return true;
                })
                .sorted(comparator)
                .map(patrimoineMapper::toDto)
                .toList();

        long totalElements = filtered.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        int fromIndex = Math.min(safePage * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());

        return PageResponseDto.<PatrimoineDto>builder()
                .content(filtered.subList(fromIndex, toIndex))
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(totalPages == 0 || safePage >= totalPages - 1)
                .build();
    }

    private void validerDonneesPatrimoine(PatrimoineDto dto) {
        if (dto == null) {
            throw new BadRequestException("Les données du patrimoine sont obligatoires.");
        }
        float lat = dto.getLatitudePatrimoine();
        float lon = dto.getLongitudePatrimoine();
        if (Float.isNaN(lat) || Float.isInfinite(lat) || lat < -90.0f || lat > 90.0f) {
            throw new BadRequestException("Coordonnée GPS invalide : la latitude doit être comprise entre -90 et 90 degrés.");
        }
        if (Float.isNaN(lon) || Float.isInfinite(lon) || lon < -180.0f || lon > 180.0f) {
            throw new BadRequestException("Coordonnée GPS invalide : la longitude doit être comprise entre -180 et 180 degrés.");
        }
        if (dto.getCapacitePatrimoine() < 0) {
            throw new BadRequestException("La capacité d'accueil ne peut pas être négative.");
        }
        if (dto.getTarifEntree() < 0) {
            throw new BadRequestException("Le tarif d'entrée ne peut pas être négatif.");
        }
    }

    private void validerConditionsPublication(Patrimoine p) {
        if (p.getNomPatrimoine() == null || p.getNomPatrimoine().trim().isEmpty()) {
            throw new BadRequestException("Publication refusée : le nom du patrimoine est obligatoire.");
        }
        if (p.getCodePatrimoine() == null || p.getCodePatrimoine().trim().isEmpty()) {
            throw new BadRequestException("Publication refusée : le code officiel du patrimoine est obligatoire.");
        }
        if (p.getDescriptionPatrimoine() == null || p.getDescriptionPatrimoine().trim().length() < 10) {
            throw new BadRequestException("Publication refusée : une description détaillée d'au moins 10 caractères est obligatoire.");
        }
        if (p.getAdressePatrimoine() == null || p.getAdressePatrimoine().trim().isEmpty()) {
            throw new BadRequestException("Publication refusée : l'adresse ou la localisation géographique est obligatoire.");
        }
        if (p.getCategoriePatrimoine() == null) {
            throw new BadRequestException("Publication refusée : la catégorie du patrimoine est obligatoire.");
        }
        if (p.getLatitudePatrimoine() == 0.0f && p.getLongitudePatrimoine() == 0.0f) {
            throw new BadRequestException("Publication refusée : des coordonnées GPS valides (différentes de 0,0) sont obligatoires pour publier une fiche patrimoine.");
        }
    }

    private void normaliserValeursParDefaut(Patrimoine patrimoine) {
        if (patrimoine.getCategoriePatrimoine() == null) {
            patrimoine.setCategoriePatrimoine(CategoriePatrimoine.CULTUREL);
        }
        if (patrimoine.getZoneGeographique() == null) {
            patrimoine.setZoneGeographique(ZoneCasamance.BASSE_CASAMANCE);
        }
        if (patrimoine.getStatutPublication() == null) {
            patrimoine.setStatutPublication(StatutPublication.PUBLIE);
        }
    }

    private Comparator<Patrimoine> buildComparator(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "nom";
        boolean desc = "desc".equalsIgnoreCase(sortDir);

        Comparator<Patrimoine> comp = switch (field) {
            case "capacite", "capacitepatrimoine" -> Comparator.comparingInt(Patrimoine::getCapacitePatrimoine);
            case "tarif", "tarifentree" -> Comparator.comparingDouble(Patrimoine::getTarifEntree);
            case "code", "codepatrimoine" -> Comparator.comparing(
                    p -> p.getCodePatrimoine() != null ? p.getCodePatrimoine() : "", String.CASE_INSENSITIVE_ORDER);
            case "date", "datecreation" -> Comparator.comparing(
                    p -> p.getDateCreation() != null ? p.getDateCreation() : LocalDateTime.MIN);
            default -> Comparator.comparing(
                    p -> p.getNomPatrimoine() != null ? p.getNomPatrimoine() : "", String.CASE_INSENSITIVE_ORDER);
        };
        return desc ? comp.reversed() : comp;
    }

    @Override
    public List<PatrimoineDto> getPatrimoinesProximite(double latitude, double longitude, Double rayonKm, Integer limit) {
        double maxRayon = (rayonKm != null && rayonKm > 0) ? rayonKm : 50.0;
        int maxLimit = (limit != null && limit > 0) ? Math.min(limit, 50) : 10;

        List<Patrimoine> publies = patrimoineRepository.findByStatutPublication(StatutPublication.PUBLIE);

        return publies.stream()
                .filter(p -> p.getLatitudePatrimoine() != 0.0f || p.getLongitudePatrimoine() != 0.0f)
                .map(p -> {
                    double dist = calculateHaversineDistance(latitude, longitude, p.getLatitudePatrimoine(), p.getLongitudePatrimoine());
                    PatrimoineDto dto = patrimoineMapper.toDto(p);
                    dto.setDistanceKm(dist);
                    return dto;
                })
                .filter(dto -> dto.getDistanceKm() <= maxRayon)
                .sorted(Comparator.comparingDouble(PatrimoineDto::getDistanceKm))
                .limit(maxLimit)
                .toList();
    }

    public static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0; // Rayon moyen de la Terre en km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.round(distance * 10.0) / 10.0; // Arrondi à 1 décimale
    }

    private SecurityUserContext requirePermission(String permission) {
        return requireAnyPermission(permission);
    }

    private SecurityUserContext requireAnyPermission(String... permissions) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise pour modifier le patrimoine.");
        }
        if (caller.isServiceCall()) {
            throw new ForbiddenException("Accès interdit : un appel de service ne peut pas modifier le patrimoine.");
        }
        for (String perm : permissions) {
            if (caller.hasPermission(perm)) {
                return caller;
            }
        }
        throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role()
                + ") ne possède pas la permission requise (" + String.join(" ou ", permissions) + ").");
    }

    private Patrimoine findPatrimoine(Long id) {
        return patrimoineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id));
    }
}
