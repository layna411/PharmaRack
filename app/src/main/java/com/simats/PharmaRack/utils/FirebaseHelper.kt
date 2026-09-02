package com.simats.PharmaRack.utils

import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.simats.PharmaRack.models.Medicine

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

    fun sendRackSignal(rackNumber: Int) {
        racksRef.orderByChild("rackNumber").equalTo(rackNumber.toDouble())
            .addListenerForSingleValueEvent(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    for (child in snapshot.children) {
                        child.ref.child("opened").setValue(true)
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            child.ref.child("opened").setValue(false)
                        }, 2000)
                    }
                }
                override fun onCancelled(error: DatabaseError) {}
            })
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
