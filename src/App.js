import React, { useEffect, useCallback } from 'react';
import { withAuthenticator } from "@aws-amplify/ui-react";

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import AccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion'
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import InputBase from '@mui/material/InputBase';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Auth } from "aws-amplify";
import "amazon-connect-streams";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import './App.css';
import { ccpConfig } from './config'

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  padding: theme.spacing(1),
  // textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

const initialSettings = {
  modelRegion: '',
  // connectInstance: 'https://${YOUR_CONNECT_INSTANCE_NAME}.my.connect.aws',
  connectInstance: '',
  connectRegion: '',
  modelId: ''
}

const classes = {
  ccpGrid: {
    height: "80vh",
    border: "1px solid black"
  }
};

let suggestionsList = {};
const Alert = React.forwardRef(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function App({ signOut, user }) {
  const [settings, setSettings] = React.useState(initialSettings);
  const [suggestions, setSuggestions] = React.useState({ "prompt": "test" });
  const [expanded, setExpanded] = React.useState('settings');
  const [clientStarted, setClientStarted] = React.useState(false);
  const [ccpStarted, setCcpStarted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [searchPrompt, setSearchPrompt] = React.useState('');
  const [errMess, setErrMess] = React.useState('');

  const [ccpStyle, setCcpStyle] = React.useState({ width: '100%', height: '100%', display: 'none' });

  const handleSnackClick = (errMess = '') => {
    setErrMess(errMess);
    setOpen(true);
  };

  const handleSnackClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handlePanelChange =
    (panel) => (event, newExpanded) => {
      setExpanded(newExpanded ? panel : false);
    };

  async function generateResponse({ user, prompt }) {
    try {
      if (settings.modelId && settings.modelRegion) {

        const body = JSON.stringify({
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: 300,
          temperature: 0.5,
          top_k: 250,
          top_p: 1,
          stop_sequences: ["\n\nHuman:"],
          anthropic_version: "bedrock-2023-05-31",
        });
        const params = {
          modelId: settings.modelId,
          contentType: "application/json",
          accept: "*/*",
          body: body,
        };
        suggestionsList = Object.assign({}, suggestionsList);
        suggestionsList[prompt] = {
          user,
          prompt,
          completion: '...'
        };

        setSuggestions(suggestionsList);
        setSearchPrompt('');

        const command = new InvokeModelCommand(params);
        const data = await window.bedRockClient.send(command);
        let textDecoder = new TextDecoder();
        let result = JSON.parse(textDecoder.decode(data.body));
        suggestionsList = Object.assign({}, suggestionsList);
        suggestionsList[prompt].completion = result.completion;
        setSuggestions(suggestionsList);
      }

    } catch (err) {
      console.log(err);
      suggestionsList = Object.assign({}, suggestionsList);
      suggestionsList[prompt].completion = err.message;
      setSuggestions(suggestionsList);
      handleSnackClick(err.message);
    }
  }

  const handleChange = (e, key) => {
    const _settings = Object.assign({}, settings);
    _settings[key] = e.target.value;
    setSettings(_settings);
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter" && searchPrompt) {
      event.preventDefault()
      generateResponse({ user: 'agent', prompt: searchPrompt });
    }
  };

  const handleSearchChange = (event) => {
    setSearchPrompt(event.target.value);
  }

  const onClearSearch = () => {
    setSearchPrompt('');
  };

  useEffect(() => {
    try {
      // try to use browser settings.
      const _settings = JSON.parse(localStorage.getItem('Settings')) || {};
      setSettings(_settings);
    } catch (err) { console.log(err) }
    // initCCP();
  }, []);

  useEffect(() => {

  }, [window.bedRockClient])

  function processChat(chatEvent, suggestions) {
    const _chatEvent = JSON.parse(chatEvent.content);

    // check if event message from cx
    if (_chatEvent.ParticipantRole === 'CUSTOMER' && _chatEvent.Type === 'MESSAGE' && _chatEvent.Content) {
      generateResponse({ user: 'customer', prompt: _chatEvent.Content });
    }
  }
  
  const initCCP = useCallback((suggestions) => {
    const _settings = JSON.parse(localStorage.getItem('Settings')) || {};
    console.log(_settings)
    try {
      if (_settings.connectInstance && _settings.connectRegion) {
        const containerDiv = document.getElementById("container-ccp");

        ccpConfig.ccpUrl = `${_settings.connectInstance}/connect/ccp-v2/`;
        ccpConfig.region = _settings.connectRegion;

        window.connect.core.initCCP(containerDiv, ccpConfig);
        window.connect.core.onAuthorizeSuccess(() => {
          setCcpStarted(true);
          console.log("authorization succeeded! Hooray");

        });

        window.connect.core.onInitialized(function () {
          const socket = window.connect.core.getWebSocketManager();

          setCcpStyle({ width: '100%', height: '100%', display: 'block' });

          socket.onAllMessage(function (event) {
            if (event.topic === 'aws/chat') {
              processChat(event, suggestions)
            }
          })
        });
      }

    } catch (err) {
      console.log(err);
      handleSnackClick(err.message);
    }

  }, []);

  async function createBedRockClient() {
    // handleSnackClick("Some error");
    try {
      const _settings = JSON.parse(localStorage.getItem('Settings'));
      const { accessKeyId, identityId, secretAccessKey, sessionToken } = await Auth.currentCredentials();
      window.bedRockClient = new BedrockRuntimeClient({
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        },
        region: _settings.modelRegion,
      });
      generateResponse({ user: 'system', prompt: 'quote of the day.' });
    } catch (err) {
      console.log(err);
      handleSnackClick(err.message);
    }
  }

  function startSampleApplication() {
    console.log('Starting app.');
    setClientStarted(true);
    localStorage.setItem('Settings', JSON.stringify(settings));
    initCCP();
    createBedRockClient();
  }
  

  function removeSuggestion(item) {
    suggestionsList = Object.assign({}, suggestionsList);
    delete suggestionsList[item.prompt];
    setSuggestions(suggestionsList);
  }

  return (
    <Box component="section" sx={{ p: 2, border: '1px dashed grey' }}>

      <Container maxWidth="false">
        <Grid container spacing={2}>
        <Grid xs={12}>
        <Accordion expanded={expanded === 'settings'} onChange={handlePanelChange('settings')}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="settings-content" id="settings-header">
              <Typography>Application Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Box
                  component="form"
                  sx={{
                    '& .MuiTextField-root': { pt: 3, width: '50%' },
                  }}
                  noValidate
                  autoComplete="off"
                >
                  <div>
                    <TextField fullWidth
                      value={settings.modelId} onChange={(e) => handleChange(e, 'modelId')}
                      margin="normal"
                      required
                      id="modelid"
                      label="Model Id"
                      placeholder='anthropic.claude-instant-v1'
                      helperText="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html"
                    />

                    <TextField fullWidth
                      value={settings.modelRegion} onChange={(e) => handleChange(e, 'modelRegion')}
                      margin="normal"
                      required
                      id="modelRegion"
                      label="Model region"
                      placeholder='us-east-1'
                      helperText=""
                    />
                    <TextField fullWidth
                      value={settings.connectInstance} onChange={(e) => handleChange(e, 'connectInstance')}
                      margin="normal"
                      required
                      id="connectInstance"
                      label="Connect instance"
                      placeholder='https://${YOUR_CONNECT_INSTANCE_NAME}.my.connect.aws'
                      helperText="https://docs.aws.amazon.com/connect/latest/adminguide/find-instance-name.html"
                    />
                    <TextField fullWidth
                      value={settings.connectRegion} onChange={(e) => handleChange(e, 'connectRegion')}
                      margin="normal"
                      required
                      id="connectRegion"
                      label="Connect region"
                      placeholder='us-east-1'
                      helperText=""
                    />
                  </div>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={startSampleApplication}
                >
                  Update Settings and Start Application
                </Button>
              </div>
            </AccordionDetails>
          </Accordion>
          </Grid>
 
          <Grid xs={4}>
            <Item> <div id="container-ccp" style={ccpStyle}></div></Item>
            
          </Grid>
          <Grid xs={8} >
            {clientStarted && (
              <Item>
                <Paper
                  component="form"
                  sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%' }}
                >

                  <InputBase
                    onKeyDown={handleSearchKeyDown}
                    onChange={handleSearchChange}
                    value={searchPrompt}
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Search AWS Bedrock Generative AI"
                    inputProps={{ 'aria-label': 'Search AWS Bedrock' }}
                  />
                  <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
                    <SearchIcon />
                  </IconButton>
                </Paper>
                <div></div>
                <Grid xs={12}></Grid>

                <Box sx={{ width: '100%' }}>
                  <Stack spacing={2}>
                    <Item>
                      {Object.keys(suggestions).reverse().map((key) => (
                        <Card sx={{}} key={Math.random()} style={{ 'flexDirection': 'row-reverse' }}>
                          <CardContent>

                            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                             {suggestions[key].user}:  {suggestions[key].prompt}
                            </Typography>

                            <Typography variant="body2">
                              {suggestions[key].completion}
                            </Typography>
                          </CardContent>
                          <CardActions disableSpacing
                            sx={{
                              alignSelf: "stretch",
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "flex-start",
                              // 👇 Edit padding to further adjust position
                              p: 0,
                            }}>
                            <Button size="small"
                              onClick={((e) => removeSuggestion(suggestions[key]))} >Remove</Button>
                          </CardActions>
                        </Card>

                      ))}
                    </Item>
                  </Stack>
                </Box>

              </Item>
            )}

          </Grid>
        </Grid>
      </Container>
      <Button color="error"
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        onClick={signOut}
      >
        Logout
      </Button>
      <Stack>
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleSnackClose}>
      <Alert severity="error">{errMess}</Alert>
      </Snackbar>
      </Stack>
     
    </Box>
  );
}
// 
export default withAuthenticator(App, { theme: null });
// export default (App);
