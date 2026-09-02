package com.simats.PharmaRack

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
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

class EmptySlotsActivity : AppCompatActivity() {
    
    private lateinit var rvEmptySlots: RecyclerView
    private lateinit var adapter: LowStockAdapter
    private val lowStockMedicines = mutableListOf<Medicine>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_empty_slots)

        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        findViewById<TextView>(R.id.tvTitle).text = "Low Stock Medicines"

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

    class LowStockAdapter(
        private val medicines: List<Medicine>,
        private val onRefillClick: (Medicine) -> Unit
    ) : RecyclerView.Adapter<LowStockAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvMedicineName: TextView = view.findViewById(R.id.tvSlotName)
            val tvQtyInfo: TextView = view.findViewById(R.id.tvQtyInfo)
            val btnRefill: Button = view.findViewById(R.id.btnFill)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_empty_slot, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val medicine = medicines[position]
            holder.tvMedicineName.text = "${medicine.name} (${medicine.getRackDisplay()})"
            holder.tvQtyInfo.text = "Current Qty: ${medicine.quantity}"
            holder.btnRefill.text = "Refill"
            holder.btnRefill.setOnClickListener { onRefillClick(medicine) }
        }

        override fun getItemCount() = medicines.size
    }
}
