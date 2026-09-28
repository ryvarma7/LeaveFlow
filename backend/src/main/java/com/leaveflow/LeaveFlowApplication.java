package com.leaveflow;

import com.leaveflow.config.LeaveProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(LeaveProperties.class)
public class LeaveFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeaveFlowApplication.class, args);
    }
}
