package com.homelab.brewery.buildengine;

import com.homelab.brewery.common.entity.Build;

public interface BuildExecutor {
    /**
     * Executes a build run synchronously (intended to be run inside an async executor task).
     */
    void executeBuild(Build build);
}
