import React, { useEffect, useState } from 'react';
import { Box, Chip, Stack, Typography, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import api from '../../utils/api';

const ChainOfCustodyTimeline = ({ requestId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    api
      .get(`/requests/${requestId}/timeline`)
      .then((res) => setEvents(res.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!events.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Timeline will appear once the request progresses.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {events.map((event, index) => (
        <Box
          key={`${event.type}-${index}`}
          sx={{
            pl: 2,
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={event.type} size="small" color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {event.timestamp ? dayjs(event.timestamp).format('MMM DD, HH:mm') : '—'}
            </Typography>
          </Stack>
          <Typography variant="body2">{event.detail}</Typography>
          <Typography variant="caption" color="text.secondary">
            Actor: {event.actor}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

export default ChainOfCustodyTimeline;
