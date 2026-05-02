package com.ghost;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GhostApplication {

    public static void main(String[] args) {
        SpringApplication.run(GhostApplication.class, args);
    }
}
