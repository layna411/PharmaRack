package com.simats.PharmaRack

import com.google.firebase.database.IgnoreExtraProperties

/**
 * Data class representing a User in PharmaRack
 */
@IgnoreExtraProperties
data class User(
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "worker" // "admin" or "worker"
) {
    fun isAdmin(): Boolean = role.equals("admin", ignoreCase = true)
}
