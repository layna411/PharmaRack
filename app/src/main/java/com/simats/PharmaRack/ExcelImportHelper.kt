package com.simats.PharmaRack

import android.content.Context
import android.net.Uri

/**
 * Excel import functionality has been removed.
 */
class ExcelImportHelper(private val context: Context) {
    fun parseExcelFile(uri: Uri): List<Medicine> = emptyList()
    fun validateMedicines(medicines: List<Medicine>): Pair<Boolean, String> = Pair(false, "Excel import is disabled")
}
