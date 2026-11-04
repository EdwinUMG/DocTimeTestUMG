import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, data } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import axios from "axios";
import { toast } from "react-toastify";

const Appointment = () => {
  const { docId } = useParams();
  const { doctors, backendUrl, getDoctorsData, token } = useContext(AppContext);
  const [docInfo, setDocInfo] = useState({});
  const navigate = useNavigate();

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // slot booking
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");

  // fetchDocInfo
  const fetchDocInfo = async () => {
    const docInfo = doctors.find((doc) => doc._id === docId);
    setDocInfo(docInfo);
    console.log(docInfo);
  };

  const getAvailableSlots = async () => {
    setDocSlots([]);

    //
    let today = new Date();
    for (let i = 0; i < 7; i++) {
      // getting date with index
      let currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);

      // setting end time of the date with index
      let endTime = new Date();
      endTime.setDate(today.getDate() + i);
      endTime.setHours(21, 0, 0, 0);

      // setting hours
      if (today.getDate() === currentDate.getDate()) {
        currentDate.setHours(
          currentDate.getHours > 10 ? currentDate.getHours() + 1 : 10
        );
        currentDate.setMinutes(currentDate.getMinutes > 30 ? 30 : 0);
      } else {
        currentDate.setHours(10);
        currentDate.setMinutes(0);
      }

      let timeSlots = [];
      while (currentDate < endTime) {
        let formattedTime = currentDate.toLocaleDateString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        let day = currentDate.getDate();
        let month = currentDate.getMonth() + 1; // Months are zero-based in JavaScript
        let year = currentDate.getFullYear();

        let slotDate = day + "_" + month + "_" + year;
        let slotTime = formattedTime;

        const isSlotAvailable =
          docInfo.slots_booked[slotDate] &&
          docInfo.slots_booked[slotDate].includes(slotTime)
            ? false
            : true;
        if (isSlotAvailable) {
          // add slot to array
          timeSlots.push({
            datetime: new Date(currentDate),
            time: formattedTime,
          });
        }

        // increment time by 30 minutes
        currentDate = new Date(currentDate.getTime() + 30 * 60 * 1000);
      }

      setDocSlots((prevSlots) => [...prevSlots, timeSlots]);
    }
  };

  const bookAppointment = async () => {
    if (!token) {
      toast.warn("Please login to book an appointment");
      return navigate("/login");
    }

    try {
      const date = docSlots[slotIndex][0].datetime;

      let day = date.getDate();
      let month = date.getMonth() + 1; // Months are zero-based in JavaScript
      let year = date.getFullYear();

      const slotDate = day + "_" + month + "_" + year;

      const { data } = await axios.post(
        `${backendUrl}/api/v1/user/book-appointment`,
        {
          docId,
          slotDate,
          slotTime,
        },
        {
          headers: {
            token,
          },
        }
      );

      if (data.success) {
        toast.success(data.message);
        getDoctorsData();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(error.response.data.message);
    }
  };

  useEffect(() => {
    fetchDocInfo();
  }, [doctors, docId]);

  useEffect(() => {
    getAvailableSlots();
  }, [docInfo]);

  useEffect(() => {
    console.log(docSlots);
  }, [docInfo, slotIndex]);

  return (
    <div className="container mx-auto p-4 bg-[#F8F2DE]">
      {/* doc details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <img
            src={docInfo.image}
            alt={docInfo.name}
            className="w-full h-64 object-cover rounded-lg shadow-sm"
          />
        </div>

        <div className="md:w-2/3">
          {/* doc info: name, degree, exp */}
          <h1 className="text-2xl font-bold text-[#A31D1D] mb-2">
            {docInfo.name}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <p className="bg-[#ECDCBF] text-[#A31D1D] px-3 py-1 rounded-full text-sm">
              {docInfo.degree}
            </p>
            <p className="bg-[#ECDCBF] text-[#A31D1D] px-3 py-1 rounded-full text-sm">
              {docInfo.specialization}
            </p>
            <button className="bg-[#D84040] text-white px-3 py-1 rounded-full text-sm">
              {docInfo.experience} Years
            </button>
          </div>

          {/* doc about */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-semibold text-lg">About</p>
              <img src={assets.info_icon} alt="" className="w-4 h-4" />
            </div>
            <p className="text-gray-700">{docInfo.about}</p>
          </div>
          <p className="text-lg font-medium">
            Appointment Fee:
            <span className="text-[#D84040] font-bold">${docInfo.fees}</span>
          </p>
        </div>
      </div>

      {/* booking slots */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-[#A31D1D] mb-4">Booking Slots</h2>

        {/* Days selection */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {docSlots.length > 0 &&
            docSlots.map((item, index) => (
              <div
                onClick={() => setSlotIndex(index)}
                className={`text-center cursor-pointer p-3 rounded-lg transition-colors duration-200 ${
                  slotIndex === index
                    ? "bg-[#D84040] text-white"
                    : "bg-[#ECDCBF] hover:bg-opacity-80"
                }`}
                key={index}
              >
                <p className="font-medium">
                  {item[0] && daysOfWeek[item[0].datetime.getDay()]}
                </p>
                <p className="text-xl font-bold">
                  {item[0] && item[0].datetime.getDate()}
                </p>
              </div>
            ))}
        </div>

        {/* Time slots */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Available Time Slots</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2">
            {docSlots.length > 0 &&
              docSlots[slotIndex] &&
              docSlots[slotIndex].map((item, index) => (
                <div
                  onClick={() => setSlotTime(item.time)}
                  className={`text-center cursor-pointer p-3 rounded-lg transition-colors duration-200 ${
                    slotTime === item.time
                      ? "bg-[#D84040] text-white"
                      : "border border-[#ECDCBF] hover:bg-[#ECDCBF] hover:bg-opacity-50"
                  }`}
                  key={index}
                >
                  <p className="font-medium">{item.time}</p>
                </div>
              ))}
          </div>
        </div>

        <button
          onClick={bookAppointment}
          type="button"
          className={`w-full py-3 rounded-lg font-bold transition-colors duration-300 ${
            slotTime
              ? "bg-[#D84040] hover:bg-[#A31D1D] text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!slotTime}
        >
          Book Appointment
        </button>
      </div>

      {/* listing related doctors */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#A31D1D] mb-4">
          Similar {docInfo.specialization} Doctors
        </h2>
        <RelatedDoctors docId={docId} specialization={docInfo.specialization} />
      </div>
    </div>
  );
};

export default Appointment;
