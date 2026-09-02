package com.simats.PharmaRack

import android.app.AlertDialog
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.simats.PharmaRack.adapters.MedicineAdapter
import com.simats.PharmaRack.models.Medicine
import com.simats.PharmaRack.utils.FirebaseHelper

class RackDetailsActivity : AppCompatActivity() {
    
    private val firebaseHelper = FirebaseHelper()
    private lateinit var rvMedicines: RecyclerView
    private lateinit var emptyState: LinearLayout
    private lateinit var adapter: MedicineAdapter
    private val medicineList = mutableListOf<Medicine>()
    private var userRole: String = "worker"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_rack_details)

        userRole = intent.getStringExtra("USER_ROLE") ?: "worker"

        val rackName = intent.getStringExtra("RACK_NAME") ?: "Rack Details"
        findViewById<TextView>(R.id.tvRackTitle).text = rackName

        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        // LED Blinking Logic: Trigger Firebase when rack is opened
        val rackNumberStr = rackName.substringAfter("Rack ").substringBefore(" (").trim()
        val rackNumber = rackNumberStr.toIntOrNull()
        
        if (rackNumber != null) {
            firebaseHelper.sendRackSignal(rackNumber)
        }

        rvRacksSetup()
        fetchMedicinesForRack(rackName)
    }

    private fun rvRacksSetup() {
        rvMedicines = findViewById(R.id.rvMedicines)
        rvMedicines.layoutManager = LinearLayoutManager(this)
        adapter = MedicineAdapter(medicineList) { medicine ->
            if (userRole.equals("admin", ignoreCase = true)) {
                showEditDialog(medicine)
            } else {
                showPickDialog(medicine)
            }
        }
        rvMedicines.adapter = adapter
        emptyState = findViewById(R.id.emptyState)
    }

    private fun fetchMedicinesForRack(rackName: String) {
        val database = FirebaseDatabase.getInstance()
        val medicinesRef = database.getReference("medicines")

        medicinesRef.orderByChild("rack").equalTo(rackName)
            .addValueEventListener(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    medicineList.clear()
                    for (child in snapshot.children) {
                        try {
                            val medicine = child.getValue(Medicine::class.java)
                            if (medicine != null) {
                                medicineList.add(medicine)
                            }
                        } catch (e: Exception) {}
                    }

                    if (medicineList.isEmpty()) {
                        emptyState.visibility = View.VISIBLE
                        rvMedicines.visibility = View.GONE
                    } else {
                        emptyState.visibility = View.GONE
                        rvMedicines.visibility = View.VISIBLE
                        adapter.notifyDataSetChanged()
                    }
                }

                override fun onCancelled(error: DatabaseError) {}
            })
    }

    private fun showPickDialog(medicine: Medicine) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.setContentView(R.layout.dialog_pick_tablet)
        dialog.setCancelable(true)

        val tvName = dialog.findViewById<TextView>(R.id.tvPickMedicineName)
        val tvSlotInfo = dialog.findViewById<TextView>(R.id.tvPickSlotInfo)
        val tvCurrentQty = dialog.findViewById<TextView>(R.id.tvPickCurrentQty)
        val btnPickOne = dialog.findViewById<Button>(R.id.btnPickOne)
        val etPickQty = dialog.findViewById<EditText>(R.id.etPickQuantity)
        val btnPickCustom = dialog.findViewById<Button>(R.id.btnPickCustom)
        val btnCancel = dialog.findViewById<Button>(R.id.btnPickCancel)

        tvName.text = medicine.name
        tvSlotInfo.text = "Rack: ${medicine.getRackDisplay()}, Slot: ${medicine.getSlotDisplay()}"
        tvCurrentQty.text = "Available Quantity: ${medicine.quantity}"

        val database = FirebaseDatabase.getInstance().getReference("medicines").child(medicine.id ?: "")

        btnPickOne.setOnClickListener {
            if (medicine.quantity > 0) {
                database.child("quantity").setValue(medicine.quantity - 1).addOnSuccessListener {
                    val rackNumberStr = medicine.getRackDisplay().substringAfter("Rack ").substringBefore(" (").trim()
                    val rackNumber = rackNumberStr.toIntOrNull()
                    if (rackNumber != null) {
                        firebaseHelper.sendRackSignal(rackNumber)
                    }
                    Toast.makeText(this, "Picked 1 tablet of ${medicine.name}", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                }
            } else {
                Toast.makeText(this, "Out of stock!", Toast.LENGTH_SHORT).show()
            }
        }

        btnPickCustom.setOnClickListener {
            val toPick = etPickQty.text.toString().toIntOrNull() ?: 0
            if (toPick in 1..medicine.quantity) {
                database.child("quantity").setValue(medicine.quantity - toPick).addOnSuccessListener {
                    val rackNumberStr = medicine.getRackDisplay().substringAfter("Rack ").substringBefore(" (").trim()
                    val rackNumber = rackNumberStr.toIntOrNull()
                    if (rackNumber != null) {
                        firebaseHelper.sendRackSignal(rackNumber)
                    }
                    Toast.makeText(this, "Picked $toPick tablets of ${medicine.name}", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                }
            } else {
                Toast.makeText(this, "Invalid quantity", Toast.LENGTH_SHORT).show()
            }
        }

        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
        dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun showEditDialog(medicine: Medicine) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.setContentView(R.layout.dialog_edit_medicine)
        dialog.setCancelable(true)

        val etName = dialog.findViewById<EditText>(R.id.etEditName)
        val tvCurrentQty = dialog.findViewById<TextView>(R.id.tvCurrentQty)
        val etRemoveQty = dialog.findViewById<EditText>(R.id.etRemoveQty)
        val btnMinusOne = dialog.findViewById<Button>(R.id.btnMinusOne)
        val btnRemoveCustom = dialog.findViewById<Button>(R.id.btnRemoveCustom)
        val btnSave = dialog.findViewById<Button>(R.id.btnSaveName)
        val btnDelete = dialog.findViewById<ImageView>(R.id.btnDeleteMedicine)

        etName.setText(medicine.name)
        tvCurrentQty.text = "Current Quantity: ${medicine.quantity}"

        val database = FirebaseDatabase.getInstance().getReference("medicines").child(medicine.id ?: "")

        btnMinusOne.setOnClickListener {
            if (medicine.quantity > 0) {
                database.child("quantity").setValue(medicine.quantity - 1)
                dialog.dismiss()
            }
        }

        btnRemoveCustom.setOnClickListener {
            val toRemove = etRemoveQty.text.toString().toIntOrNull() ?: 0
            if (toRemove > 0 && toRemove <= medicine.quantity) {
                database.child("quantity").setValue(medicine.quantity - toRemove)
                dialog.dismiss()
            } else {
                Toast.makeText(this, "Invalid quantity", Toast.LENGTH_SHORT).show()
            }
        }

        btnSave.setOnClickListener {
            val newName = etName.text.toString().trim()
            if (newName.isNotEmpty()) {
                database.child("name").setValue(newName)
                dialog.dismiss()
            }
        }

        btnDelete.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Delete Medicine")
                .setMessage("Are you sure you want to delete ${medicine.name} entirely?")
                .setPositiveButton("Delete") { _, _ ->
                    database.removeValue().addOnSuccessListener {
                        Toast.makeText(this, "Medicine deleted", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        dialog.show()
        dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }
}
