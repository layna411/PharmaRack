package com.simats.pharmaRack.models

import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.IgnoreExtraProperties
import com.simats.pharmaRack.utils.RackUtils

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
        return RackUtils.formatRackDisplay(rack, rackNumber)
    }

    fun getSlotDisplay(): String {
        val slotStr = slot?.toString()?.trim() ?: ""
        return slotStr.ifEmpty { "1" }
    }

    companion object {
        fun fromSnapshot(snapshot: DataSnapshot): Medicine? {
            if (!snapshot.exists()) return null
            val key = snapshot.key ?: return null
            val name = snapshot.child("name").value?.toString()?.trim() ?: ""
            if (name.isEmpty()) return null

            val rackVal = snapshot.child("rack").value
            val rackNumRaw = snapshot.child("rackNumber").value
            val parsedRackNum = (rackNumRaw as? Number)?.toInt()
                ?: rackNumRaw?.toString()?.toIntOrNull()
                ?: RackUtils.getRackNumber(rackVal?.toString() ?: "")

            val slotVal = snapshot.child("slot").value
            val qtyRaw = snapshot.child("quantity").value
            val parsedQty = (qtyRaw as? Number)?.toInt()
                ?: qtyRaw?.toString()?.toIntOrNull()
                ?: 0

            val status = snapshot.child("status").value?.toString() ?: "Available"
            val id = snapshot.child("id").value?.toString()?.takeIf { it.isNotBlank() } ?: key

            return Medicine(
                id = id,
                name = name,
                rack = rackVal,
                rackNumber = parsedRackNum,
                slot = slotVal,
                quantity = parsedQty,
                status = status
            )
        }
    }
}
