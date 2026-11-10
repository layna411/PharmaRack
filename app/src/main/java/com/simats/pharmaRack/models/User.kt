package com.simats.pharmaRack.models

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class User(
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "worker",
    val color: String = "#00FF00"
) {
    fun isAdmin(): Boolean = role.equals("admin", ignoreCase = true)
}
