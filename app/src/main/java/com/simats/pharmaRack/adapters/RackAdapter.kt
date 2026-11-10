package com.simats.pharmaRack.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.pharmaRack.R

class RackAdapter(
    private val racks: List<String>,
    private val onRackClick: (String) -> Unit
) : RecyclerView.Adapter<RackAdapter.RackViewHolder>() {

    private var rackCounts: Map<String, Int> = emptyMap()

    class RackViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvRackName: TextView = view.findViewById(R.id.tvRackName)
        val tvRackCount: TextView = view.findViewById(R.id.tvRackCount)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RackViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_rack, parent, false)
        return RackViewHolder(view)
    }

    override fun onBindViewHolder(holder: RackViewHolder, position: Int) {
        val rackName = racks[position]
        holder.tvRackName.text = rackName
        val count = rackCounts[rackName] ?: 0
        holder.tvRackCount.text = if (count == 1) "1 Medicine" else "$count Medicines"
        holder.itemView.setOnClickListener { onRackClick(rackName) }
    }

    fun updateCounts(newCounts: Map<String, Int>) {
        rackCounts = newCounts
        notifyDataSetChanged()
    }

    override fun getItemCount() = racks.size
}
