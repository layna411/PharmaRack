package com.simats.PharmaRack.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.PharmaRack.R

class RackAdapter(
    private val racks: List<String>,
    private val onRackClick: (String) -> Unit
) : RecyclerView.Adapter<RackAdapter.RackViewHolder>() {

    class RackViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvRackName: TextView = view.findViewById(R.id.tvRackName)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RackViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_rack, parent, false)
        return RackViewHolder(view)
    }

    override fun onBindViewHolder(holder: RackViewHolder, position: Int) {
        val rackName = racks[position]
        holder.tvRackName.text = rackName
        holder.itemView.setOnClickListener { onRackClick(rackName) }
    }

    override fun getItemCount() = racks.size
}
