package com.simats.PharmaRack.utils

object RackUtils {
    fun getRacks(): List<String> {
        val racks = mutableListOf<String>()
        for (i in 0 until 24) {
            val letter = ('A' + i).toString()
            racks.add("Rack ${i + 1} ($letter)")
        }
        racks.add("Rack 25 (Y, Z)")
        return racks
    }

    fun getRackNumber(rackName: String): Int {
        val rackNumberStr = rackName.substringAfter("Rack ").substringBefore(" (").trim()
        return rackNumberStr.toIntOrNull() ?: 0
    }

    fun getAllowedLetters(rackName: String): List<String> {
        val allowedLettersStr = rackName.substringAfter("(").substringBefore(")")
        return if (allowedLettersStr.contains(",")) {
            allowedLettersStr.split(",").map { it.trim() }
        } else {
            listOf(allowedLettersStr.trim())
        }
    }
}
