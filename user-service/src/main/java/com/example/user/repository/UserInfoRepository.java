package com.example.user.repository;

import com.example.user.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {
    Optional<UserInfo> findByEmailIgnoreCase(String email);
    List<UserInfo> findAllByOrderByUserIdAsc();
}
