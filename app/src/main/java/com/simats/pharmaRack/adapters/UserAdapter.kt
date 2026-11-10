package com.simats.pharmaRack.adapters

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.pharmaRack.R
import com.simats.pharmaRack.models.User

class UserAdapter(
    private val users: List<User>,
    private val onDeleteClick: (User) -> Unit
) : RecyclerView.Adapter<UserAdapter.UserViewHolder>() {

    class UserViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvItemUserName)
        val tvEmail: TextView = view.findViewById(R.id.tvItemUserEmail)
        val tvRole: TextView = view.findViewById(R.id.tvItemUserRole)
        val viewColorDot: View = view.findViewById(R.id.viewUserColorDot)
        val btnDelete: ImageView = view.findViewById(R.id.btnDeleteUser)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_user, parent, false)
        return UserViewHolder(view)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        val user = users[position]
        holder.tvName.text = user.name
        holder.tvEmail.text = user.email.ifBlank { "Staff Account" }
        holder.tvRole.text = user.role.replaceFirstChar { it.uppercase() }

        val parsedColor = try {
            Color.parseColor(user.color.ifBlank { "#00FF00" })
        } catch (_: Exception) {
            Color.parseColor("#00FF00")
        }
        val dot = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(parsedColor)
            setStroke(3, Color.parseColor("#CBD5E1"))
        }
        holder.viewColorDot.background = dot

        holder.btnDelete.setOnClickListener { onDeleteClick(user) }
    }

    override fun getItemCount() = users.size
}
