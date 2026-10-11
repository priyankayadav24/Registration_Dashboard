package com.example.auth.repository;

import com.example.auth.entity.UserCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserCredentialRepository extends JpaRepository<UserCredential, Long> {
    Optional<UserCredential> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
