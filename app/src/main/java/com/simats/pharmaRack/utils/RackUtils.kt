package com.simats.pharmaRack.utils

import com.simats.pharmaRack.models.Medicine

object RackUtils {
    val LED_COLORS: List<Pair<String, String>> = listOf(
        "Green (Default)" to "#00FF00",
        "Red" to "#FF0000",
        "Blue" to "#0000FF",
        "Yellow" to "#FFFF00",
        "Magenta" to "#FF00FF",
        "Cyan" to "#00FFFF",
        "Orange" to "#FF8000",
        "Purple" to "#8000FF",
        "Pink" to "#FF007F",
        "White" to "#FFFFFF"
    )

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
        val match = Regex("""\d+""").find(rackName)
        return match?.value?.toIntOrNull() ?: 0
    }

    fun getAllowedLetters(rackName: String): List<String> {
        if (!rackName.contains("(") || !rackName.contains(")")) return emptyList()
        val allowedLettersStr = rackName.substringAfter("(").substringBefore(")")
        return if (allowedLettersStr.contains(",")) {
            allowedLettersStr.split(",").map { it.trim().uppercase() }
        } else {
            listOf(allowedLettersStr.trim().uppercase())
        }
    }

    fun formatRackDisplay(rack: Any?, rackNumber: Int): String {
        val rackStr = rack?.toString()?.trim() ?: ""
        if (rackStr.startsWith("Rack ", ignoreCase = true) && rackStr.contains("(")) {
            return rackStr
        }
        val num = rackNumber.takeIf { it > 0 } ?: getRackNumber(rackStr)
        return when {
            num in 1..24 -> "Rack $num (${'A' + num - 1})"
            num == 25 -> "Rack 25 (Y, Z)"
            rackStr.isNotEmpty() -> "Rack $rackStr"
            else -> "Unknown Rack"
        }
    }

    fun isMedicineInRack(medicine: Medicine, rackName: String): Boolean {
        if (rackName.isBlank()) return false
        val targetRackNum = getRackNumber(rackName)
        val medRackStr = medicine.rack?.toString()?.trim() ?: ""

        // 1. Direct or case-insensitive rack string equality
        if (medRackStr.equals(rackName.trim(), ignoreCase = true)) return true

        // 2. Numeric rack number equality (matches "8", 8, "Rack 8", "Rack 8 (H)", rackNumber=8)
        val medRackNum = medicine.rackNumber.takeIf { it > 0 } ?: getRackNumber(medRackStr)
        if (targetRackNum > 0 && medRackNum == targetRackNum) return true

        // 3. String prefix match
        if (targetRackNum > 0 && medRackStr.isNotEmpty()) {
            if (medRackStr.equals("Rack $targetRackNum", ignoreCase = true) ||
                medRackStr.startsWith("Rack $targetRackNum ", ignoreCase = true) ||
                medRackStr.startsWith("Rack $targetRackNum(", ignoreCase = true)
            ) {
                return true
            }
        }

        // 4. First-letter fallback only when no explicit rack number exists
        if (medRackNum <= 0 && medicine.name.isNotBlank()) {
            val firstLetter = medicine.name.trim().take(1).uppercase()
            if (getAllowedLetters(rackName).contains(firstLetter)) return true
        }

        return false
    }
}
