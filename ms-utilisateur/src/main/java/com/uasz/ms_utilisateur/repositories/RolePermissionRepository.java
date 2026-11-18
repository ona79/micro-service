package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.RolePermission;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRole(RoleUtilisateur role);

    @Query("SELECT rp.permissionCode FROM RolePermission rp WHERE rp.role = :role")
    List<String> findPermissionCodesByRole(@Param("role") RoleUtilisateur role);
}
