package com.simats.PharmaRack.models

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class Medicine(
    val id: String? = null,
    val name: String = "",
    val rack: Any? = null,
    val rackNumber: Int = 0,
    val slot: Any? = null,
    val quantity: Int = 0,
    val status: String = "Available"
) {
    fun getRackDisplay(): String {
        return when (rack) {
            is Long -> "Rack $rack"
            is Int -> "Rack $rack"
            is String -> rack.toString()
            else -> rack?.toString() ?: "Unknown Rack"
        }
    }

    fun getSlotDisplay(): String {
        return slot?.toString() ?: "N/A"
    }
}
