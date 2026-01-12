// App.js
import React, { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import axios from "axios";

import { Box, Typography, CircularProgress } from "@mui/material";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";

/*
  GOOGLE OAUTH SETUP

  1. Go to Google Cloud Console
  2. Create OAuth Client ID (type: Web application)
  3. Add your app URL to Authorized JavaScript origins
     e.g. http://localhost:3000
  4. Enable Google Calendar API
*/

const CLIENT_ID = "72353563798-tla2ojjl5bb584nnkjqktctgvj6kjvg2.apps.googleusercontent.com";

// Calendar IDs
const PUBLIC_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";
//const WORK_CALENDAR_ID = "daya.airody@gmail.com@group.calendar.google.com";
const WORK_CALENDAR_ID = "daya.airody@gmail.com";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export default function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  /*
  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);
*/

  // Initialize OAuth Token Client
  const initAuth = useCallback(() => {
    console.log("inside initAuth");
    if (!window.google) {
      console.log("google object is not ready");
      return;
    }
    if (! window.google.accounts.oauth2)
      console.log("browser is not ready for oauth");
    console.log("calling oauth");
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        console.log("tokenResponse " + tokenResponse);
        setAccessToken(tokenResponse.access_token);
      },
    });

    tokenClient.requestAccessToken();
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (accessToken) {
      fetchHolidays();
    }
  }, [accessToken]);

  const fetchCalendarEvents = async (calendarId) => {
    const year = new Date().getFullYear();
    const timeMin = new Date(year, 0, 1).toISOString();
    const timeMax = new Date(year, 11, 31).toISOString();

    const res = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
        },
      }
    );

    return res.data.items;
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const [publicEvents, workEvents] = await Promise.all([
        fetchCalendarEvents(PUBLIC_CALENDAR_ID),
        fetchCalendarEvents(WORK_CALENDAR_ID),
      ]);

      console.log("publicEvents:", publicEvents);
      console.log("workEvents:", workEvents);

      const formatted = [
        ...publicEvents.map((e) => ({
          date: dayjs(e.start.date || e.start.dateTime),
          type: "public",
          title: e.summary,
        })),
        ...workEvents.map((e) => ({
          date: dayjs(e.start.date || e.start.dateTime),
          type: "work",
          title: e.summary,
        })),
      ];

      setHolidays(formatted);
    } catch (err) {
      console.error("Failed to load holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  const getHolidayForDay = (day) =>
    holidays.find((h) => h.date.isSame(day, "day"));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          p: 4,
          maxWidth: 420,
          margin: "auto",
          textAlign: "center",
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" mb={2}>
          Company Holiday Calendar
        </Typography>

        {loading && <CircularProgress size={24} />}

        <DatePicker
          label="Select Date"
          renderDay={(day, selectedDays, pickersDayProps) => {
            const holiday = getHolidayForDay(day);

            return (
              <PickersDay
                {...pickersDayProps}
                title={holiday?.title}
                sx={{
                  backgroundColor:
                    holiday?.type === "public"
                      ? "#ffebee"
                      : holiday?.type === "work"
                      ? "#e3f2fd"
                      : "inherit",
                  border:
                    holiday?.type === "public"
                      ? "1px solid #d32f2f"
                      : holiday?.type === "work"
                      ? "1px solid #1976d2"
                      : "none",
                  color: holiday ? "#000" : "inherit",
                  "&:hover": {
                    backgroundColor:
                      holiday?.type === "public"
                        ? "#ffcdd2"
                        : holiday?.type === "work"
                        ? "#bbdefb"
                        : undefined,
                  },
                }}
              />
            );
          }}
        />

        <Box mt={3}>
          <Typography variant="body2" sx={{ color: "#d32f2f" }}>
            ■ Public Holiday
          </Typography>
          <Typography variant="body2" sx={{ color: "#1976d2" }}>
            ■ Work Holiday
          </Typography>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}