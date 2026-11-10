package com.simats.pharmaRack.utils

import com.google.android.gms.tasks.Tasks
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.MutableData
import com.google.firebase.database.Transaction
import com.google.firebase.database.ValueEventListener
import com.simats.pharmaRack.models.Medicine

class FirebaseHelper {

    private val database = FirebaseDatabase.getInstance()
    private val medicinesRef = database.getReference("medicines")
    private val racksRef = database.getReference("racks")

    fun addMedicine(medicine: Medicine, onComplete: (Boolean) -> Unit) {
        val id = medicinesRef.push().key ?: return
        val newMedicine = medicine.copy(id = id)
        medicinesRef.child(id).setValue(newMedicine)
            .addOnSuccessListener { onComplete(true) }
            .addOnFailureListener { onComplete(false) }
    }

    fun searchMedicine(query: String, onResult: (Medicine?) -> Unit) {
        medicinesRef.addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                var found: Medicine? = null
                for (child in snapshot.children) {
                    val med = child.getValue(Medicine::class.java)
                    if (med?.name?.contains(query, ignoreCase = true) == true) {
                        found = med
                        break
                    }
                }
                onResult(found)
            }

            override fun onCancelled(error: DatabaseError) {
                onResult(null)
            }
        })
    }

    @JvmOverloads
    fun sendRackSignal(rackNumber: Int, colorHex: String = "#00FF00") {
        if (rackNumber < 0 || rackNumber > 25) return

        val finalColor = if (rackNumber == 0) {
            "#000000"
        } else {
            colorHex.takeIf { it.isNotBlank() && it != "#000000" } ?: "#00FF00"
        }

        val rootRef = database.reference
        val rackTask = rootRef.child("active_rack").setValue(rackNumber)
        val colorTask = rootRef.child("active_color").setValue(finalColor)
        rootRef.child("blink_trigger").setValue(rackNumber)
        rootRef.child("last_click_time").setValue(System.currentTimeMillis())

        // Wait for active_rack & active_color writes before incrementing command_id so ESP32 never reads stale data
        Tasks.whenAllComplete(rackTask, colorTask).addOnCompleteListener {
            rootRef.child("command_id").runTransaction(object : Transaction.Handler {
                override fun doTransaction(currentData: MutableData): Transaction.Result {
                    val currentVal = (currentData.value as? Number)?.toLong() ?: 0L
                    currentData.value = currentVal + 1L
                    return Transaction.success(currentData)
                }

                override fun onComplete(
                    error: DatabaseError?,
                    committed: Boolean,
                    currentData: DataSnapshot?
                ) {
                    // Hardware command dispatched
                }
            })
        }

        if (rackNumber > 0) {
            val rackNodeRef = racksRef.child("rack_$rackNumber")
            rackNodeRef.child("rackNumber").setValue(rackNumber)
            rackNodeRef.child("opened").setValue(true)
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                rackNodeRef.child("opened").setValue(false)
            }, 4000)
        }
    }

    fun initializeRacks() {
        for (i in 1..25) {
            val rackData = mapOf(
                "rackNumber" to i,
                "opened" to false
            )
            racksRef.child("rack_$i").setValue(rackData)
        }
    }
}
