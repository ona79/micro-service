package com.uasz.ms_patrimoine.repositories;

import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface PatrimoineRepository extends JpaRepository<Patrimoine, Long>, JpaSpecificationExecutor<Patrimoine> {

    Optional<Patrimoine> findByCodePatrimoineIgnoreCase(String codePatrimoine);

    boolean existsByCodePatrimoineIgnoreCase(String codePatrimoine);

    List<Patrimoine> findByStatutPublication(StatutPublication statutPublication);

    List<Patrimoine> findByCategoriePatrimoineAndStatutPublication(
            CategoriePatrimoine categoriePatrimoine, StatutPublication statutPublication);

    List<Patrimoine> findByZoneGeographiqueAndStatutPublication(
            ZoneCasamance zoneGeographique, StatutPublication statutPublication);
}
