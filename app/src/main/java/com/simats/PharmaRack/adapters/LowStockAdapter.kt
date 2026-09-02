package com.simats.PharmaRack.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.PharmaRack.R
import com.simats.PharmaRack.models.Medicine

class LowStockAdapter(
    private val medicines: List<Medicine>,
    private val onRefillClick: (Medicine) -> Unit
) : RecyclerView.Adapter<LowStockAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvMedicineName: TextView = view.findViewById(R.id.tvSlotName)
        val tvQtyInfo: TextView = view.findViewById(R.id.tvQtyInfo)
        val btnRefill: Button = view.findViewById(R.id.btnFill)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_empty_slot, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val medicine = medicines[position]
        holder.tvMedicineName.text = "${medicine.name} (${medicine.getRackDisplay()})"
        holder.tvQtyInfo.text = "Current Qty: ${medicine.quantity}"
        holder.btnRefill.text = "Refill"
        holder.btnRefill.setOnClickListener { onRefillClick(medicine) }
    }

    override fun getItemCount() = medicines.size
}
