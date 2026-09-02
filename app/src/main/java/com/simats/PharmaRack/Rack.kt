package com.simats.PharmaRack

data class Rack(
    val rackNumber: Int,
    val letter: String,
    val status: String // e.g., "Available", "Low Stock", "Unavailable"
)
