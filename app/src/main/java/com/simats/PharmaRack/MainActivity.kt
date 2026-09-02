package com.simats.PharmaRack

import android.app.AlertDialog
import android.app.Dialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
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
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener

class MainActivity : AppCompatActivity() {

    private lateinit var rackAdapter: RackAdapter
    private lateinit var searchAdapter: MedicineAdapter
    private val firebaseHelper = FirebaseHelper()
    private lateinit var auth: FirebaseAuth
    
    private val allMedicines = mutableListOf<Medicine>()
    private lateinit var rvRacks: RecyclerView
    private lateinit var rvSearch: RecyclerView
    private var currentQuery: String = ""
    private var userRole: String = "worker"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        auth = FirebaseAuth.getInstance()

        rvRacks = findViewById(R.id.rvRacks)
        rvSearch = findViewById(R.id.rvSearch)
        val ivLogout: ImageView = findViewById(R.id.ivLogout)
        val tvUserWelcome: TextView = findViewById(R.id.tvUserWelcome)
        val llAddMedicine: LinearLayout = findViewById(R.id.llAddMedicine)
        val llEmptySlots: LinearLayout = findViewById(R.id.llEmptySlots)
        val llManageUsers: LinearLayout = findViewById(R.id.llManageUsers)
        val bottomNav: LinearLayout = findViewById(R.id.bottomNav)
        val etSearch: EditText = findViewById(R.id.etSearch)

        // Get user info from Intent
        val userName = intent.getStringExtra("USER_NAME") ?: "User"
        userRole = intent.getStringExtra("USER_ROLE") ?: "worker"
        
        tvUserWelcome.text = "Welcome, $userName (${userRole.replaceFirstChar { it.uppercase() }})"

        // Configure Role-Based Permissions
        if (userRole.equals("admin", ignoreCase = true)) {
            bottomNav.visibility = View.VISIBLE
            llAddMedicine.visibility = View.VISIBLE
            llEmptySlots.visibility = View.VISIBLE
            llManageUsers.visibility = View.VISIBLE
        } else {
            bottomNav.visibility = View.GONE
            llAddMedicine.visibility = View.GONE
            llEmptySlots.visibility = View.GONE
            llManageUsers.visibility = View.GONE
        }

        llManageUsers.setOnClickListener {
            val intent = Intent(this, ManageUsersActivity::class.java)
            startActivity(intent)
        }

        // Setup Racks Adapter
        val racks = mutableListOf<String>()
        for (i in 0 until 24) {
            val letter = ('A' + i).toString()
            racks.add("Rack ${i + 1} ($letter)")
        }
        racks.add("Rack 25 (Y, Z)")

        rackAdapter = RackAdapter(racks) { rackName ->
            openRackDetails(rackName)
        }
        rvRacks.layoutManager = GridLayoutManager(this, 5)
        rvRacks.adapter = rackAdapter

        // Setup Search Results Adapter
        searchAdapter = MedicineAdapter(emptyList()) { medicine ->
            if (userRole.equals("admin", ignoreCase = true)) {
                triggerHardwareSignal(medicine.getRackDisplay())
                showEditDialog(medicine)
            } else {
                showPickDialog(medicine)
            }
        }
        rvSearch.layoutManager = LinearLayoutManager(this)
        rvSearch.adapter = searchAdapter

        // Load all medicines for searching
        fetchAllMedicines()

        // Search Filter Logic
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                currentQuery = s.toString().trim()
                if (currentQuery.isEmpty()) {
                    showRacks()
                } else {
                    performSearch(currentQuery)
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        ivLogout.setOnClickListener {
            auth.signOut()
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        }

        llAddMedicine.setOnClickListener {
            val intent = Intent(this, AddMedicineActivity::class.java)
            startActivity(intent)
        }

        llEmptySlots.setOnClickListener {
            val intent = Intent(this, EmptySlotsActivity::class.java)
            startActivity(intent)
        }
    }

    private fun fetchAllMedicines() {
        FirebaseDatabase.getInstance().getReference("medicines")
            .addValueEventListener(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    allMedicines.clear()
                    for (child in snapshot.children) {
                        try {
                            val medicine = child.getValue(Medicine::class.java)
                            if (medicine != null) allMedicines.add(medicine)
                        } catch (e: Exception) {}
                    }
                    if (currentQuery.isNotEmpty()) performSearch(currentQuery)
                }
                override fun onCancelled(error: DatabaseError) {}
            })
    }

    private fun performSearch(query: String) {
        val filteredMedicines = allMedicines.filter { 
            it.name.contains(query, ignoreCase = true) 
        }
        
        rvRacks.visibility = View.GONE
        rvSearch.visibility = View.VISIBLE
        searchAdapter.updateList(filteredMedicines)
    }

    private fun showRacks() {
        rvRacks.visibility = View.VISIBLE
        rvSearch.visibility = View.GONE
    }

    private fun openRackDetails(rackName: String) {
        triggerHardwareSignal(rackName)
        val intent = Intent(this, RackDetailsActivity::class.java)
        intent.putExtra("RACK_NAME", rackName)
        intent.putExtra("USER_ROLE", userRole)
        startActivity(intent)
    }

    private fun triggerHardwareSignal(rackName: String) {
        val rackNumberStr = rackName.substringAfter("Rack ").substringBefore(" (").trim()
        val rackNumber = rackNumberStr.toIntOrNull()

        if (rackNumber != null) {
            firebaseHelper.sendRackSignal(rackNumber)
            Toast.makeText(this, "Signal sent to $rackName", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showPickDialog(medicine: Medicine) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
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
                    triggerHardwareSignal(medicine.getRackDisplay())
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
                    triggerHardwareSignal(medicine.getRackDisplay())
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
