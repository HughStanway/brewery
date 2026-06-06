package com.homelab.brewery.buildengine;

import com.homelab.brewery.common.entity.Build;

public interface BuildQueueManager {
    /**
     * Enqueues a build for asynchronous execution.
     */
    void enqueue(Build build);
}
