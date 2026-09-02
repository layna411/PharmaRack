package com.simats.PharmaRack

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class RackAdapter(
    private var rackList: List<String>,
    private val onItemClick: (String) -> Unit
) : RecyclerView.Adapter<RackAdapter.RackViewHolder>() {

    private var filteredList: List<String> = rackList

    class RackViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvRackName: TextView = view.findViewById(R.id.tvRackName)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RackViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_rack, parent, false)
        return RackViewHolder(view)
    }

    override fun onBindViewHolder(holder: RackViewHolder, position: Int) {
        val rackName = filteredList[position]
        holder.tvRackName.text = rackName
        holder.itemView.setOnClickListener { onItemClick(rackName) }
    }

    override fun getItemCount() = filteredList.size

    fun filter(query: String) {
        filteredList = if (query.isEmpty()) {
            rackList
        } else {
            rackList.filter { it.contains(query, ignoreCase = true) }
        }
        notifyDataSetChanged()
    }
}
