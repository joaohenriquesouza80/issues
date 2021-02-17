import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  DeviceEventEmitter,
  PermissionsAndroid,
  Alert
} from 'react-native';

import Beacons from 'react-native-beacons-manager';

import * as Yup from 'yup';

import { Form } from '@unform/mobile';
import { FormHandles } from '@unform/core';

import Icon from 'react-native-vector-icons/Feather';

import Input from '../../components/Input';
import InputMask from '../../components/InputMask';
import Button from '../../components/Button';

import {
  Container,
  HeaderContainer,
  HeaderButtonContainer,
  HeaderTitle,
  ContentContainer,

  BeaconAwaitContainer,
  BeaconAwaitText,
  BeaconAwaitIconContainer,

  BeaconContentContainer,
  BeaconContainer,

  InfoBeaconIdentified,
  LabelInfoBeaconIdentified,

  InfoGroupContainer,
  InfoContainer,
  InputContainer,
  Label,
  LabelBold,
} from './styles';
import api from '../../services/api';

interface IBeaconInfoData {
  uuid: string;
  major: number;
  minor: number;
}

interface IBeaconFoundedData {
  distance: number,
  major: number,
  minor: number,
  proximity: string,
  rssi: number,
  uuid: string
}

interface ICreateDeviceFormData {
  beacon_alias: string,
  distance_to_alert: number,
}

const CreateDevice: React.FC = () => {

  const formRef = useRef<FormHandles>(null);
  const { goBack, navigate } = useNavigation();

  const [beaconInfoData, setBeaconInfoData] = useState<IBeaconInfoData>({} as IBeaconInfoData)

  const beaconUuidInputRef = useRef<TextInput>(null);

  useEffect(() => {
    async function startEverthing() {
      await startListener();
      setBeaconInfoData({
        uuid: '445e3f19-f76e-473d-bc40-a0f26686e8e2',
        major: 123,
        minor: 456,
      });
    }

    startEverthing()
  }, []);

  const setRandomBeacon = useCallback(async () => {
    let beacon: IBeaconInfoData = {
      uuid: '445e3f19-f76e-473d-bc40-a0f26686e8e2',
      major: 123,
      minor: 456,
    };
    console.log('Initialize Beacon Info: ', beacon);
    setBeaconInfoData(beacon);
  }, []);

  const grantPermissions = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Permite ae",
          message:
            "Permite essa bagaça de usar o FINE LOCATION?",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permission Granted");
      } else {
        console.log("Permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const stopListener = useCallback(() => {
    console.log('Stopping Beacon Listener');
    DeviceEventEmitter.removeAllListeners('beaconsDidRange');
  }, []);

  const startListener = useCallback(async () => {
    console.log('Starting Beacon Listener');

    await grantPermissions();

    // Tells the library to detect iBeacons
    Beacons.detectIBeacons();

    // Start detecting all iBeacons in the nearby
    try {
      await Beacons.startRangingBeaconsInRegion('REGION1')
      console.log(`Beacons ranging started succesfully!`)
    } catch (err) {
      console.log(`Beacons ranging not started, error: ${err}`)
    }

    // Print a log of the detected iBeacons (1 per second)
    DeviceEventEmitter.addListener('beaconsDidRange', (data) => {
      checkListenedBeacons(data.beacons);
    });
  }, []);

  const checkListenedBeacons = useCallback((beaconsFounded: IBeaconFoundedData[]) => {
    if (beaconsFounded.length > 0) {
      console.log('Founded beacons!', beaconsFounded);
    }

    // Check if a Beacon already founded
    if (beaconInfoData && beaconInfoData.uuid != undefined) {
      console.log('Beacon already found. Not to do: ', beaconInfoData.uuid);
      stopListener();
      return;
    }

    beaconsFounded.forEach(beacon => {
      // Check if distance agree with minimal required
      if (beacon.distance > 0 && beacon.distance <= 0.03) {
        console.log('Distance OK');

        stopListener();

        setBeaconInfoData({
          uuid: beacon.uuid,
          major: beacon.major,
          minor: beacon.minor
        });

        console.log('Beacon to use: ', beacon);
      }
    })
  }, []);

  const navigateBack = useCallback(() => {
    stopListener();
    goBack();
  }, [goBack]);

  const handleCreateDevice = useCallback(async (data: ICreateDeviceFormData) => {
    try {
      formRef.current?.setErrors({});

      const schema = Yup.object().shape({
        beacon_alias: Yup.string().required('Apelido obrigatório'),
        distance_to_alert: Yup.number().required('Distância para alerta obrigatório'),
      });

      await schema.validate(data, {
        abortEarly: false,
      });

      const { beacon_alias, distance_to_alert } = data;
      const beacon_uuid = beaconInfoData.uuid;
      const beacon_major = beaconInfoData.major;
      const beacon_minor = beaconInfoData.minor;
      const { uuid, major, minor } = beaconInfoData;

      console.log('Chamando API: ',
        data, uuid, major, minor, beacon_uuid, beacon_major, beacon_minor);
      const apiResponse = await api.post('/beacons_devices', {
        beacon_alias,
        beacon_type: "type",
        beacon_uuid,
        beacon_major,
        beacon_minor,
        distance_to_alert,
      });

      console.log('Beacon registered: ', apiResponse.data);

      navigate('MyDevices');
    } catch (err) {
      console.log('err: ', err);
      Alert.alert(
        'Erro ao registrar o Beacon',
        'Ocorreu um erro ao tentar Registrar o Beacon. Tente novamente.'
      );
    }
  }, [navigate])

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <Container>

          <HeaderContainer>
            <HeaderButtonContainer onPress={navigateBack}>
              <Icon name="chevron-left" size={22} color="#fafafa" />
            </HeaderButtonContainer>

            <HeaderTitle>Registro de Novo Beacon</HeaderTitle>
          </HeaderContainer>

          <ContentContainer>
            {beaconInfoData.uuid === '' ? (
              <BeaconAwaitContainer>
                <BeaconAwaitIconContainer>
                  <Icon name="radio" size={100} color='#009999' />
                </BeaconAwaitIconContainer>

                <BeaconAwaitText>Aproxime o Beacon do Celular</BeaconAwaitText>
              </BeaconAwaitContainer>
            ) : (

                <BeaconContentContainer>

                  <BeaconContainer>
                    <Form ref={formRef} onSubmit={handleCreateDevice}>
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 8 }}
                      >

                        <InfoBeaconIdentified>
                          <LabelInfoBeaconIdentified>Beacon Identificado</LabelInfoBeaconIdentified>
                          <InfoContainer>
                            <LabelBold>UUID</LabelBold>
                            <Label>{beaconInfoData.uuid}</Label>
                          </InfoContainer>
                          <InfoGroupContainer>
                            <InfoContainer>
                              <LabelBold>Major</LabelBold>
                              <Label>{beaconInfoData.major}</Label>
                            </InfoContainer>
                            <InfoContainer>
                              <LabelBold>Minor</LabelBold>
                              <Label>{beaconInfoData.minor}</Label>
                            </InfoContainer>
                          </InfoGroupContainer>
                        </InfoBeaconIdentified>

                        <InputContainer>
                          <Label>Apelido do Beacon</Label>
                          <Input
                            name="beacon_alias"
                            autoCapitalize="words"
                            placeholder="apelido para identificar o Beacon"
                            maxLength={25}
                            containerStyle={{
                              marginBottom: 10,
                              height: 45,
                            }}
                            returnKeyType="next"
                          />
                        </InputContainer>

                        <InputContainer>
                          <Label>Distância para alerta</Label>

                          <InputMask
                            name="distance_to_alert"
                            placeholder="em metros"
                            keyboardType="number-pad"
                            mask="[990]"
                            maxLength={3}
                            containerStyle={{
                              width: 160,
                              height: 45,
                              marginRight: 10,
                            }}
                          />
                        </InputContainer>




                      </ScrollView>
                    </Form>
                  </BeaconContainer>

                  <Button
                    onPress={() => {
                      formRef.current?.submitForm();
                    }}>
                    Efetuar Novo Registro
                      </Button>

                </BeaconContentContainer>
              )}
          </ContentContainer>

        </Container>
      </KeyboardAvoidingView>
    </>
  )
}

export default CreateDevice;
