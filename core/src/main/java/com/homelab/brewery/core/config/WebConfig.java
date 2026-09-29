package com.homelab.brewery.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        if (requestedResource != null && requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }

                        // Check if exact .html file exists (e.g. artifacts.html, builds.html)
                        Resource htmlResource = location.createRelative(resourcePath + ".html");
                        if (htmlResource != null && htmlResource.exists() && htmlResource.isReadable()) {
                            return htmlResource;
                        }

                        // Do not intercept API or actuator requests
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("actuator/")) {
                            return null;
                        }

                        // Route-specific static HTML fallbacks for dynamic client-side hydration
                        if (resourcePath.startsWith("artifacts/")) {
                            Resource artifactFallback = location.createRelative("artifacts.html");
                            if (artifactFallback.exists() && artifactFallback.isReadable()) {
                                return artifactFallback;
                            }
                        }
                        if (resourcePath.startsWith("builds/")) {
                            Resource buildsFallback = location.createRelative("builds/1.html");
                            if (buildsFallback.exists() && buildsFallback.isReadable()) {
                                return buildsFallback;
                            }
                        }
                        if (resourcePath.startsWith("cascade/")) {
                            Resource cascadeFallback = location.createRelative("cascade/1.html");
                            if (cascadeFallback.exists() && cascadeFallback.isReadable()) {
                                return cascadeFallback;
                            }
                        }
                        if (resourcePath.startsWith("deployments/")) {
                            Resource deploymentsFallback = location.createRelative("deployments/1.html");
                            if (deploymentsFallback.exists() && deploymentsFallback.isReadable()) {
                                return deploymentsFallback;
                            }
                        }

                        // General SPA fallback to index.html
                        return location.createRelative("index.html");
                    }
                });
    }
}
