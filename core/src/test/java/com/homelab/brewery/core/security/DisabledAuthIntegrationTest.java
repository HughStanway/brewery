package com.homelab.brewery.core.security;

import com.homelab.brewery.common.repository.BuildRepository;
import com.homelab.brewery.controller.BuildController;
import com.homelab.brewery.buildengine.BuildQueueManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AuthController.class, BuildController.class})
@Import(SecurityConfig.class)
@TestPropertySource(properties = "brewery.auth.enabled=false")
public class DisabledAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private BuildRepository buildRepository;

    @MockBean
    private BuildQueueManager buildQueueManager;

    @MockBean
    private org.springframework.security.authentication.AuthenticationManager authenticationManager;

    @Test
    public void testGetCurrentUserWhenAuthDisabled() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("proxy-admin"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }

    @Test
    public void testProtectedEndpointAccessibleWithoutSessionWhenAuthDisabled() throws Exception {
        when(buildRepository.findAll(any(org.springframework.data.domain.Sort.class))).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/builds")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
