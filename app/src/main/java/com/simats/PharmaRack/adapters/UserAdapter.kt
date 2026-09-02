package com.simats.PharmaRack.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.PharmaRack.R
import com.simats.PharmaRack.models.User

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
