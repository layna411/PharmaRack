package com.simats.PharmaRack

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.app.Dialog
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.simats.PharmaRack.adapters.LowStockAdapter
import com.simats.PharmaRack.models.Medicine

class EmptySlotsActivity : AppCompatActivity() {
    
    private lateinit var rvEmptySlots: RecyclerView
    private lateinit var adapter: LowStockAdapter
    private val lowStockMedicines = mutableListOf<Medicine>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_empty_slots)

        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
            overridePendingTransition(0, 0)
        }

        findViewById<TextView>(R.id.tvTitle).text = "Low Stock Medicines"

        findViewById<View>(R.id.llAddMedicine).setOnClickListener {
            val intent = Intent(this, AddMedicineActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
            startActivity(intent)
            overridePendingTransition(0, 0)
            finish()
        }

        findViewById<View>(R.id.llManageUsers).setOnClickListener {
            val intent = Intent(this, ManageUsersActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
            startActivity(intent)
            overridePendingTransition(0, 0)
            finish()
        }

        rvEmptySlots = findViewById(R.id.rvEmptySlots)
        rvEmptySlots.layoutManager = LinearLayoutManager(this)
        adapter = LowStockAdapter(lowStockMedicines) { medicine ->
            showUpdateStockDialog(medicine)
        }
        rvEmptySlots.adapter = adapter

        fetchLowStockMedicines()
    }

    private fun fetchLowStockMedicines() {
        val database = FirebaseDatabase.getInstance()
        val medicinesRef = database.getReference("medicines")

        medicinesRef.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                lowStockMedicines.clear()
                for (child in snapshot.children) {
                    try {
                        val medicine = child.getValue(Medicine::class.java)
                        if (medicine != null && medicine.quantity < 10) {
                            lowStockMedicines.add(medicine)
                        }
                    } catch (e: Exception) {
                        // Skip items that fail to parse
                    }
                }
                adapter.notifyDataSetChanged()
            }

            override fun onCancelled(error: DatabaseError) {
                Toast.makeText(this@EmptySlotsActivity, "Error: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun showUpdateStockDialog(medicine: Medicine) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setCancelable(true)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.setContentView(R.layout.dialog_fill_slot)
        
        val tvTitle = dialog.findViewById<TextView>(R.id.tvDialogTitle)
        val etName = dialog.findViewById<EditText>(R.id.etDialogMedicineName)
        val etQty = dialog.findViewById<EditText>(R.id.etDialogQuantity)
        val btnUpdate = dialog.findViewById<Button>(R.id.btnDialogAdd)
        val btnCancel = dialog.findViewById<Button>(R.id.btnCancel)

        tvTitle.text = "Refill ${medicine.name}"
        etName.setText(medicine.name)
        etName.isEnabled = false 
        etQty.setHint("Add Quantity")
        btnUpdate.text = "Update"

        btnUpdate.setOnClickListener {
            val addedQtyStr = etQty.text.toString().trim()
            if (addedQtyStr.isNotEmpty()) {
                val addedQty = addedQtyStr.toIntOrNull() ?: 0
                val newQty = medicine.quantity + addedQty
                
                if (medicine.id != null) {
                    val database = FirebaseDatabase.getInstance()
                    database.getReference("medicines").child(medicine.id).child("quantity").setValue(newQty)
                        .addOnSuccessListener {
                            Toast.makeText(this, "Stock updated for ${medicine.name}", Toast.LENGTH_SHORT).show()
                            dialog.dismiss()
                        }
                        .addOnFailureListener {
                            Toast.makeText(this, "Failed to update stock", Toast.LENGTH_SHORT).show()
                        }
                }
            } else {
                Toast.makeText(this, "Please enter quantity", Toast.LENGTH_SHORT).show()
            }
        }

        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
        dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }
}
