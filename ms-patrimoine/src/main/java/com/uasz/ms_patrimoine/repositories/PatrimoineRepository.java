package com.uasz.ms_patrimoine.repositories;

import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatrimoineRepository extends JpaRepository<Patrimoine, Long> {

    Optional<Patrimoine> findByCodePatrimoineIgnoreCase(String codePatrimoine);

    boolean existsByCodePatrimoineIgnoreCase(String codePatrimoine);

    List<Patrimoine> findByStatutPublication(StatutPublication statutPublication);

    List<Patrimoine> findByCategoriePatrimoineAndStatutPublication(
            CategoriePatrimoine categoriePatrimoine, StatutPublication statutPublication);

    List<Patrimoine> findByZoneGeographiqueAndStatutPublication(
            ZoneCasamance zoneGeographique, StatutPublication statutPublication);
}
