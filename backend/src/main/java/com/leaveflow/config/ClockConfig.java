package com.leaveflow.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class ClockConfig {

    @Value("${leave.timezone:Asia/Kolkata}")
    private String timezone;

    @Bean
    @Primary
    public Clock clock() {
        return Clock.system(ZoneId.of(timezone));
    }
}
