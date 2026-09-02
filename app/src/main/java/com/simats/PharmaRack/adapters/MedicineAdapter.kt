package com.simats.PharmaRack.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.simats.PharmaRack.R
import com.simats.PharmaRack.models.Medicine

class MedicineAdapter(
    private var medicineList: List<Medicine>,
    private val onItemClick: (Medicine) -> Unit
) : RecyclerView.Adapter<MedicineAdapter.MedicineViewHolder>() {

    class MedicineViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvMedicineName)
        val tvSlot: TextView = view.findViewById(R.id.tvSlotInfo)
        val tvQty: TextView = view.findViewById(R.id.tvQuantity)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MedicineViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_medicine, parent, false)
        return MedicineViewHolder(view)
    }

    override fun onBindViewHolder(holder: MedicineViewHolder, position: Int) {
        val medicine = medicineList[position]
        holder.tvName.text = medicine.name
        holder.tvSlot.text = "Rack: ${medicine.getRackDisplay()}, Slot: ${medicine.getSlotDisplay()}"
        holder.tvQty.text = "Qty: ${medicine.quantity}"
        holder.itemView.setOnClickListener { onItemClick(medicine) }
    }

    override fun getItemCount() = medicineList.size

    fun updateList(newList: List<Medicine>) {
        medicineList = newList
        notifyDataSetChanged()
    }
}
