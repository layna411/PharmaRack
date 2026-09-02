package com.simats.PharmaRack

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.simats.PharmaRack.models.Medicine
import com.simats.PharmaRack.utils.FirebaseHelper
import com.simats.PharmaRack.utils.RackUtils

class AddMedicineActivity : AppCompatActivity() {
    
    private val firebaseHelper = FirebaseHelper()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_medicine)

        val btnBack: ImageView = findViewById(R.id.btnBack)
        val spinnerRack: Spinner = findViewById(R.id.spinnerRack)
        val btnAdd: Button = findViewById(R.id.btnAdd)
        val etMedicineName: EditText = findViewById(R.id.etMedicineName)
        val etSlotNumber: EditText = findViewById(R.id.etSlotNumber)
        val etQuantity: EditText = findViewById(R.id.etQuantity)

        // Setup Spinner with Racks
        val racks = RackUtils.getRacks()

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, racks)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerRack.adapter = adapter

        btnBack.setOnClickListener {
            finish()
            overridePendingTransition(0, 0)
        }

        findViewById<View>(R.id.llEmptySlots).setOnClickListener {
            val intent = Intent(this, EmptySlotsActivity::class.java).apply {
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

        btnAdd.setOnClickListener {
            val name = etMedicineName.text.toString().trim()
            val rackName = spinnerRack.selectedItem.toString()
            val slotStr = etSlotNumber.text.toString().trim()
            val qtyStr = etQuantity.text.toString().trim()

            if (name.isNotEmpty() && slotStr.isNotEmpty() && qtyStr.isNotEmpty()) {
                val slot = slotStr.toIntOrNull() ?: 0
                val quantity = qtyStr.toIntOrNull() ?: 0
                
                // Extract rack number
                val rackNumber = RackUtils.getRackNumber(rackName)

                // Validation: Check if medicine starts with correct letter for the rack
                val allowedLetters = RackUtils.getAllowedLetters(rackName)
                val allowedLettersStr = allowedLetters.joinToString(", ")
                
                val firstLetter = name.take(1).uppercase()

                if (allowedLetters.any { it == firstLetter }) {
                    val medicine = Medicine(
                        id = "", // Will be set by Firebase
                        name = name,
                        rack = rackName,
                        rackNumber = rackNumber,
                        slot = slot,
                        quantity = quantity
                    )

                    firebaseHelper.addMedicine(medicine) { success ->
                        if (success) {
                            Toast.makeText(this, "Medicine added successfully", Toast.LENGTH_SHORT).show()
                            finish()
                        } else {
                            Toast.makeText(this, "Failed to add medicine", Toast.LENGTH_SHORT).show()
                        }
                    }
                } else {
                    Toast.makeText(this, "This rack only stores medicines starting with $allowedLettersStr", Toast.LENGTH_LONG).show()
                }
            } else {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
