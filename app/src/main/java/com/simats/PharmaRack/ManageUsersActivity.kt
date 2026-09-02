package com.simats.PharmaRack

import android.app.AlertDialog
import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener

class ManageUsersActivity : AppCompatActivity() {

    private lateinit var rvUsers: RecyclerView
    private lateinit var tvEmptyUsers: TextView
    private lateinit var fabAddUser: ExtendedFloatingActionButton
    private lateinit var adapter: UserAdapter
    private val userList = mutableListOf<User>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_manage_users)

        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        rvUsers = findViewById(R.id.rvUsers)
        tvEmptyUsers = findViewById(R.id.tvEmptyUsers)
        fabAddUser = findViewById(R.id.fabAddUser)

        rvUsers.layoutManager = LinearLayoutManager(this)
        adapter = UserAdapter(userList) { userToDelete ->
            confirmDeleteUser(userToDelete)
        }
        rvUsers.adapter = adapter

        fabAddUser.setOnClickListener {
            showCreateUserDialog()
        }

        fetchUsers()
    }

    private fun fetchUsers() {
        FirebaseDatabase.getInstance().getReference("users")
            .addValueEventListener(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    userList.clear()
                    for (child in snapshot.children) {
                        try {
                            val user = child.getValue(User::class.java)
                            if (user != null) {
                                userList.add(user)
                            }
                        } catch (e: Exception) {}
                    }

                    if (userList.isEmpty()) {
                        tvEmptyUsers.visibility = View.VISIBLE
                        rvUsers.visibility = View.GONE
                    } else {
                        tvEmptyUsers.visibility = View.GONE
                        rvUsers.visibility = View.VISIBLE
                        adapter.notifyDataSetChanged()
                    }
                }

                override fun onCancelled(error: DatabaseError) {
                    Toast.makeText(this@ManageUsersActivity, "Error: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            })
    }

    private fun showCreateUserDialog() {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setContentView(R.layout.dialog_create_user)
        dialog.setCancelable(true)

        val etName = dialog.findViewById<EditText>(R.id.etNewUserName)
        val etEmail = dialog.findViewById<EditText>(R.id.etNewUserEmail)
        val etPassword = dialog.findViewById<EditText>(R.id.etNewUserPassword)
        val spinnerRole = dialog.findViewById<Spinner>(R.id.spinnerRole)
        val btnSave = dialog.findViewById<Button>(R.id.btnSaveNewUser)
        val btnCancel = dialog.findViewById<Button>(R.id.btnCancelCreateUser)

        val roles = listOf("Worker", "Admin")
        val spinnerAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerRole.adapter = spinnerAdapter

        btnSave.setOnClickListener {
            val name = etName.text.toString().trim()
            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString().trim()
            val role = spinnerRole.selectedItem.toString().lowercase()

            if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 6) {
                Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            createNewUser(name, email, password, role, dialog)
        }

        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
        dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun createNewUser(name: String, email: String, pass: String, role: String, dialog: Dialog) {
        try {
            val secondaryApp = try {
                FirebaseApp.getInstance("UserCreatorApp")
            } catch (e: Exception) {
                val options = FirebaseApp.getInstance().options
                FirebaseApp.initializeApp(this, options, "UserCreatorApp")
            }

            val secondaryAuth = FirebaseAuth.getInstance(secondaryApp)
            secondaryAuth.createUserWithEmailAndPassword(email, pass)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val uid = task.result?.user?.uid ?: ""
                        if (uid.isNotEmpty()) {
                            val newUser = User(uid = uid, name = name, email = email, role = role)
                            FirebaseDatabase.getInstance().getReference("users").child(uid).setValue(newUser)
                                .addOnSuccessListener {
                                    Toast.makeText(this, "User created successfully!", Toast.LENGTH_SHORT).show()
                                    secondaryAuth.signOut()
                                    dialog.dismiss()
                                }
                                .addOnFailureListener { e ->
                                    Toast.makeText(this, "Failed to save user: ${e.message}", Toast.LENGTH_SHORT).show()
                                    secondaryAuth.signOut()
                                }
                        }
                    } else {
                        Toast.makeText(this, "Error: ${task.exception?.message}", Toast.LENGTH_LONG).show()
                    }
                }
        } catch (e: Exception) {
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun confirmDeleteUser(user: User) {
        AlertDialog.Builder(this)
            .setTitle("Delete User")
            .setMessage("Are you sure you want to remove ${user.name} (${user.email})?")
            .setPositiveButton("Delete") { _, _ ->
                FirebaseDatabase.getInstance().getReference("users").child(user.uid).removeValue()
                    .addOnSuccessListener {
                        Toast.makeText(this, "User deleted", Toast.LENGTH_SHORT).show()
                    }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    class UserAdapter(
        private val users: List<User>,
        private val onDeleteClick: (User) -> Unit
    ) : RecyclerView.Adapter<UserAdapter.UserViewHolder>() {

        class UserViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvName: TextView = view.findViewById(R.id.tvItemUserName)
            val tvEmail: TextView = view.findViewById(R.id.tvItemUserEmail)
            val tvRole: TextView = view.findViewById(R.id.tvItemUserRole)
            val btnDelete: ImageView = view.findViewById(R.id.btnDeleteUser)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_user, parent, false)
            return UserViewHolder(view)
        }

        override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
            val user = users[position]
            holder.tvName.text = user.name
            holder.tvEmail.text = user.email
            holder.tvRole.text = user.role.replaceFirstChar { it.uppercase() }
            holder.btnDelete.setOnClickListener { onDeleteClick(user) }
        }

        override fun getItemCount() = users.size
    }
}
