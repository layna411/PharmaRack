package com.simats.PharmaRack

import com.google.firebase.database.IgnoreExtraProperties

/**
 * Model class for Medicine
 * Using flexible types to avoid crashes with existing Firebase data
 */
@IgnoreExtraProperties
data class Medicine(
    val id: String? = null,
    val name: String = "",
    val rack: Any? = null, // Can be Int (old data) or String (new data)
    val rackNumber: Int = 0,
    val slot: Any? = null, // Can be String ("A1") or Int (1)
    val quantity: Int = 0,
    val status: String = "Available"
) {
    // Helper to get rack as a String for display
    fun getRackDisplay(): String {
        return when (rack) {
            is Long -> "Rack $rack"
            is Int -> "Rack $rack"
            is String -> rack.toString()
            else -> rack?.toString() ?: "Unknown Rack"
        }
    }

    // Helper to get slot as a String for display
    fun getSlotDisplay(): String {
        return slot?.toString() ?: "N/A"
    }
}
