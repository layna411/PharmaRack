package com.simats.PharmaRack.models

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class User(
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "worker"
) {
    fun isAdmin(): Boolean = role.equals("admin", ignoreCase = true)
}
