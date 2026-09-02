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

class LoginActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        auth = FirebaseAuth.getInstance()

        // Check if user is already logged in
        if (auth.currentUser != null) {
            fetchUserAndNavigate(auth.currentUser?.uid ?: "")
        }

        val etEmail: EditText = findViewById(R.id.etEmail)
        val etPassword: EditText = findViewById(R.id.etPassword)
        val btnLogin: Button = findViewById(R.id.btnLogin)
        val tvGoToSignUp: TextView = findViewById(R.id.tvGoToSignUp)

        btnLogin.setOnClickListener {
            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            auth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this) { task ->
                    if (task.isSuccessful) {
                        // Login success
                        val userId = auth.currentUser?.uid ?: ""
                        fetchUserAndNavigate(userId)
                    } else {
                        // Login failed
                        Toast.makeText(this, "Login failed: ${task.exception?.message}",
                            Toast.LENGTH_SHORT).show()
                    }
                }
        }

        tvGoToSignUp.setOnClickListener {
            val intent = Intent(this, SignUpActivity::class.java)
            startActivity(intent)
        }
    }

    private fun fetchUserAndNavigate(userId: String) {
        FirebaseDatabase.getInstance().getReference("users").child(userId)
            .get().addOnSuccessListener { snapshot ->
                val name = snapshot.child("name").value?.toString() ?: "User"
                val role = snapshot.child("role").value?.toString() ?: "worker"

                val intent = Intent(this, MainActivity::class.java)
                intent.putExtra("USER_NAME", name)
                intent.putExtra("USER_ROLE", role)
                startActivity(intent)
                finish()
            }.addOnFailureListener {
                val intent = Intent(this, MainActivity::class.java)
                intent.putExtra("USER_NAME", "User")
                intent.putExtra("USER_ROLE", "worker")
                startActivity(intent)
                finish()
            }
    }
}
