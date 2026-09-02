package com.simats.PharmaRack

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import com.simats.PharmaRack.models.User

class SignUpActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_signup)

        auth = FirebaseAuth.getInstance()

        val etName: EditText = findViewById(R.id.etName)
        val etEmail: EditText = findViewById(R.id.etEmail)
        val etPassword: EditText = findViewById(R.id.etPassword)
        val spinnerRole: android.widget.Spinner = findViewById(R.id.spinnerRole)
        val btnSignUp: Button = findViewById(R.id.btnSignUp)
        val tvGoToLogin: TextView = findViewById(R.id.tvGoToLogin)

        val roles = listOf("Worker", "Admin")
        val spinnerAdapter = android.widget.ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerRole.adapter = spinnerAdapter

        btnSignUp.setOnClickListener {
            val name = etName.text.toString().trim()
            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString().trim()
            val role = spinnerRole.selectedItem.toString().lowercase()

            if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 6) {
                Toast.makeText(this, "Password should be at least 6 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            auth.createUserWithEmailAndPassword(email, password)
                .addOnCompleteListener(this) { task ->
                    if (task.isSuccessful) {
                        // Registration success, store user details in database
                        val userId = auth.currentUser?.uid
                        if (userId != null) {
                            val user = User(
                                uid = userId,
                                name = name,
                                email = email,
                                role = role
                            )
                            FirebaseDatabase.getInstance().getReference("users")
                                .child(userId).setValue(user)
                                .addOnSuccessListener {
                                     getSharedPreferences("PharmaRackPrefs", MODE_PRIVATE).edit()
                                         .putString("USER_NAME", name)
                                         .putString("USER_ROLE", role)
                                         .apply()

                                     Toast.makeText(this, "Registration successful", Toast.LENGTH_SHORT).show()
                                     val intent = Intent(this, MainActivity::class.java).apply {
                                         putExtra("USER_NAME", name)
                                         putExtra("USER_ROLE", role)
                                         addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                                     }
                                     startActivity(intent)
                                     overridePendingTransition(0, 0)
                                     finish()
                                 }
                        }
                    } else {
                        // If sign up fails, display a message to the user.
                        Toast.makeText(this, "Registration failed: ${task.exception?.message}",
                            Toast.LENGTH_SHORT).show()
                    }
                }
        }

        tvGoToLogin.setOnClickListener {
            finish()
        }
    }
}
