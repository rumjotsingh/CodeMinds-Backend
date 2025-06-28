import Announcement from "../models/announcement.model.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    const createdBy = req.user._id;

    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    const announcement = await Announcement.create({
      title,
      message,
      createdBy,
    });
    res.status(201).json({ message: "Announcement created", announcement });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating announcement", error: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");
    res.status(200).json(announcements);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching announcements", error: error.message });
  }
};
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const updated = await Announcement.findByIdAndUpdate(
      id,
      { title, message },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement updated", updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update announcement", error: error.message });
  }
};
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete announcement", error: error.message });
  }
};
