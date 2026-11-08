package com.uasz.ms_patrimoine.repositories;

import com.uasz.ms_patrimoine.entities.Patrimoine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatrimoineRepository extends JpaRepository<Patrimoine, Long> {
}

