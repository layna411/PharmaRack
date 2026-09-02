package com.simats.PharmaRack

import com.google.firebase.database.DatabaseReference
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.ValueEventListener

/**
 * Helper class for Firebase Operations
 */
class FirebaseHelper {

    private val database: FirebaseDatabase = FirebaseDatabase.getInstance()
    private val medicinesRef: DatabaseReference = database.getReference("medicines")
    private val racksRef: DatabaseReference = database.getReference("racks")

    /**
     * Function to add medicine data to Firebase
     */
    fun addMedicine(medicine: Medicine, onComplete: (Boolean) -> Unit) {
        val id = medicinesRef.push().key ?: return
        val newMedicine = medicine.copy(id = id)
        
        medicinesRef.child(id).setValue(newMedicine)
            .addOnSuccessListener { onComplete(true) }
            .addOnFailureListener { onComplete(false) }
    }

    /**
     * Function to search medicine by name
     */
    fun searchMedicine(name: String, onResult: (Medicine?) -> Unit) {
        medicinesRef.orderByChild("name").equalTo(name)
            .addListenerForSingleValueEvent(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    if (snapshot.exists()) {
                        val medicine = snapshot.children.first().getValue(Medicine::class.java)
                        onResult(medicine)
                    } else {
                        onResult(null)
                    }
                }

                override fun onCancelled(error: DatabaseError) {
                    onResult(null)
                }
            })
    }

    /**
     * Function to send signal to a specific rack (Update Firebase to 1)
     * This triggers the hardware LED
     */
    fun sendRackSignal(rackNumber: Int) {
        val rackPath = "rack$rackNumber"
        racksRef.child(rackPath).setValue(1)
            .addOnSuccessListener {
                // Signal sent successfully, hardware LED should blink
                // Reset back to 0 after 5 seconds to stop blinking
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    racksRef.child(rackPath).setValue(0)
                }, 5000)
            }
    }

    /**
     * Function to initialize all 25 racks to 0 (default state)
     */
    fun initializeRacks() {
        val racksData = mutableMapOf<String, Int>()
        for (i in 1..25) {
            racksData["rack$i"] = 0
        }
        racksRef.setValue(racksData)
    }
}
