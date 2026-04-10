import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Camera, CircleAlert, ClipboardCheck, LogIn, LogOut, RefreshCcw, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FacialCapture } from '../common/FacialCapture';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import publicCheckInService, { type PublicCheckInResponse } from '../../services/publicCheckInService';
import { usePublicBranchInfoQuery } from '../../hooks/usePublicBranchInfoQuery';
import { queryKeys } from '../../lib/queryKeys';
import publicCheckInSessionService from '../../services/publicCheckInSessionService';
import { normalizeEmail } from '../../utils/formatters';

const DARK_SURFACE = '#0F1838';
const CARD_SURFACE = '#162552';
const TOTEM_LANGUAGE_KEY = 'public-check-in:language';

type UiLanguage = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';

const UI_COPY: Record<UiLanguage, Record<string, string>> = {
  'pt-BR': {
    languageLabel: 'Idioma',
    languagePt: 'Português (BR)',
    languageEn: 'English',
    languageEs: 'Español',
    languageFr: 'Français',
    statusQueued: 'Na fila de atendimento',
    statusNoConfirmed: 'Sem agendamento confirmado',
    statusPatientNotFound: 'Paciente não encontrado',
    statusFaceNotRecognized: 'Rosto não reconhecido',
    titleCheckInArrival: 'Check-in de chegada',
    titleEnterKiosk: 'Entrar no modo totem',
    subtitleCheckInArrival: 'Posicione seu rosto na câmera para identificarmos você e localizarmos seu atendimento de hoje.',
    subtitleEnterKiosk: 'Use o login da clínica para habilitar este totem, manter a operação auditável e liberar o check-in da filial.',
    loginEmailLabel: 'Email do usuário',
    loginEmailPlaceholder: 'usuario@clinica.com',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Digite sua senha',
    loginButton: 'Entrar e ligar o totem',
    kioskAuthenticated: 'Totem autenticado',
    startFacial: 'Iniciar reconhecimento facial',
    firstTimeButton: 'Primeira vez? Cadastre seu rosto',
    firstTimeTitle: 'Primeiro acesso no totem',
    firstTimeDescription: 'Informe seu CPF para localizar seu cadastro e registrar seu rosto pela primeira vez.',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    cancel: 'Cancelar',
    findRecord: 'Localizar cadastro',
    manualFallbackHint: 'Se não conseguirmos identificar você, a recepção poderá continuar o atendimento manualmente.',
    blockedHint: 'Sem login, o totem permanece bloqueado e o check-in da filial não fica acessível.',
    resultTitle: 'Resultado do check-in',
    branchConfigured: 'Filial configurada',
    branchLoading: 'Carregando filial...',
    branchNotIdentified: 'Não foi possível identificar a filial configurada.',
    resultNeedsLogin: 'Entre com um usuário da clínica para liberar o check-in desta filial.',
    closeKiosk: 'Encerrar totem',
    kioskLockedTitle: 'Totem bloqueado até autenticação',
    kioskLockedDescription: 'O check-in desta filial agora exige login de um usuário da clínica. Depois do login, o atendimento fica auditável e o totem pode ser desligado com logout.',
    checkInOffTitle: 'Check-in desligado para esta filial',
    checkInOffDescription: 'Esta URL já está correta, mas o check-in público ainda precisa ser ligado nas configurações da filial para começar a funcionar.',
    waitingTitle: 'Aguardando identificação',
    waitingDescription: 'Assim que o reconhecimento facial for concluído, vamos mostrar aqui se você já foi encaminhado para a fila da recepção.',
    unknownPatient: 'Não conseguimos identificar você',
    cpfPrefix: 'CPF',
    faceRetryHint: 'Você pode tentar novamente com melhor iluminação ou seguir para a recepção para identificação manual.',
    trustPrefix: 'Confiança do reconhecimento',
    appointmentsTodayTitle: 'Agendamentos localizados hoje',
    scheduledFallback: 'Agendado',
    procedureFallback: 'Procedimento',
    doctorFallback: 'Profissional não informado',
    insurancePrefix: 'Convênio',
    facialRegisterTitle: 'Cadastro facial do paciente',
    facialRecognitionTitle: 'Reconhecimento facial de chegada',
    facialRegisterDescription: 'Posicione seu rosto no centro da câmera para concluir o cadastro facial.',
    facialRecognitionDescription: 'Posicione seu rosto no centro da câmera. Vamos validar sua identidade e localizar seu atendimento de hoje.',
    closeKioskModalTitle: 'Encerrar totem',
    closeKioskModalText: 'Para evitar desligamentos acidentais, confirme a senha do usuário autenticado antes de encerrar este totem.',
    userPasswordLabel: 'Senha do usuário',
    userPasswordPlaceholder: 'Digite a senha',
    confirmClose: 'Confirmar encerramento',
    loginRequiredTitle: 'Login necessário',
    loginRequiredMessage: 'Informe email e senha para ligar o modo totem.',
    kioskReleasedTitle: 'Totem liberado',
    kioskReleasedMessage: 'Login realizado com sucesso. O check-in já está pronto para uso.',
    loginErrorTitle: 'Erro ao entrar',
    loginErrorMessage: 'Não foi possível autenticar este usuário.',
    confirmNeededTitle: 'Confirmação necessária',
    confirmNeededMessage: 'Digite a senha do usuário autenticado para encerrar o totem.',
    kioskClosedTitle: 'Totem encerrado',
    kioskClosedMessage: 'O check-in foi desligado neste navegador.',
    wrongPasswordTitle: 'Senha incorreta',
    wrongPasswordMessage: 'Não foi possível encerrar o totem com a senha informada.',
    sessionExpiredTitle: 'Sessão expirada',
    sessionExpiredMessageCheckIn: 'Entre novamente para continuar usando o check-in desta filial.',
    sessionExpiredMessageTotem: 'Entre novamente para continuar usando o totem.',
    invalidCpfTitle: 'CPF inválido',
    invalidCpfMessage: 'Digite um CPF válido para localizar seu cadastro.',
    branchMissingTitle: 'Filial não identificada',
    branchMissingMessage: 'Este totem precisa estar vinculado a uma filial válida.',
    lookupErrorTitle: 'Erro ao localizar cadastro',
    lookupErrorMessage: 'Não foi possível localizar seu cadastro pelo CPF informado.',
    faceRegisterDoneMessageQueued: 'Cadastro facial concluído com sucesso. Você já foi encaminhado para a fila da recepção.',
    faceRegisterDoneMessageDefault: 'Cadastro facial concluído com sucesso.',
    faceRegisterDoneTitle: 'Cadastro facial concluído',
    faceRegisterDoneToast: 'Seu rosto foi cadastrado com sucesso.',
    faceRegisterErrorTitle: 'Erro ao cadastrar rosto',
    faceRegisterErrorMessage: 'Não foi possível concluir o cadastro facial.',
    kioskUrlMissing: 'URL do totem sem filial configurada.',
    branchLookupError: 'Não foi possível identificar a filial configurada.',
    kioskNeedsBranch: 'Este totem precisa ser acessado com uma filial configurada na URL.',
    checkInDisabledError: 'O check-in desta filial está desligado no momento.',
    faceNotRecognizedError: 'Não conseguimos reconhecer seu rosto com confiança suficiente.',
    checkInGenericError: 'Não foi possível concluir o check-in. Tente novamente ou procure a recepção.',
    statusMessageQueued: 'Check-in realizado com sucesso. Paciente enviado para a fila de atendimento.',
    statusMessageNoConfirmed: 'Paciente reconhecido, mas sem agendamento confirmado para hoje.',
    statusMessagePatientNotFound: 'Paciente não encontrado para esta filial.',
    statusMessageFaceNotRecognized: 'Não conseguimos reconhecer seu rosto com confiança suficiente.',
  },
  'en-US': {
    languageLabel: 'Language',
    languagePt: 'Portuguese (BR)',
    languageEn: 'English',
    languageEs: 'Spanish',
    languageFr: 'French',
    statusQueued: 'In the care queue',
    statusNoConfirmed: 'No confirmed appointment',
    statusPatientNotFound: 'Patient not found',
    statusFaceNotRecognized: 'Face not recognized',
    titleCheckInArrival: 'Arrival check-in',
    titleEnterKiosk: 'Enter kiosk mode',
    subtitleCheckInArrival: 'Position your face in front of the camera so we can identify you and find today’s appointment.',
    subtitleEnterKiosk: 'Use the clinic login to enable this kiosk, keep operations auditable, and unlock branch check-in.',
    loginEmailLabel: 'User email',
    loginEmailPlaceholder: 'user@clinic.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Sign in and enable kiosk',
    kioskAuthenticated: 'Kiosk authenticated',
    startFacial: 'Start facial recognition',
    firstTimeButton: 'First time? Register your face',
    firstTimeTitle: 'First kiosk access',
    firstTimeDescription: 'Enter your CPF to find your record and register your face for the first time.',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    cancel: 'Cancel',
    findRecord: 'Find record',
    manualFallbackHint: 'If we cannot identify you, reception can continue with manual check-in.',
    blockedHint: 'Without login, the kiosk remains locked and branch check-in is unavailable.',
    resultTitle: 'Check-in result',
    branchConfigured: 'Configured branch',
    branchLoading: 'Loading branch...',
    branchNotIdentified: 'Could not identify the configured branch.',
    resultNeedsLogin: 'Sign in with a clinic user to enable check-in for this branch.',
    closeKiosk: 'Close kiosk',
    kioskLockedTitle: 'Kiosk locked until authentication',
    kioskLockedDescription: 'Check-in for this branch now requires a clinic user login. After login, operation is auditable and the kiosk can be closed with logout.',
    checkInOffTitle: 'Check-in is off for this branch',
    checkInOffDescription: 'This URL is correct, but public check-in must still be enabled in branch settings.',
    waitingTitle: 'Waiting for identification',
    waitingDescription: 'As soon as facial recognition is completed, we will show whether you were sent to reception queue.',
    unknownPatient: 'We could not identify you',
    cpfPrefix: 'CPF',
    faceRetryHint: 'You can try again with better lighting or proceed to reception for manual identification.',
    trustPrefix: 'Recognition confidence',
    appointmentsTodayTitle: 'Today’s appointments found',
    scheduledFallback: 'Scheduled',
    procedureFallback: 'Procedure',
    doctorFallback: 'Professional not informed',
    insurancePrefix: 'Insurance',
    facialRegisterTitle: 'Patient facial registration',
    facialRecognitionTitle: 'Arrival facial recognition',
    facialRegisterDescription: 'Center your face in the camera to complete facial registration.',
    facialRecognitionDescription: 'Center your face in the camera. We will validate your identity and locate today’s appointment.',
    closeKioskModalTitle: 'Close kiosk',
    closeKioskModalText: 'To avoid accidental shutdown, confirm the authenticated user password before closing this kiosk.',
    userPasswordLabel: 'User password',
    userPasswordPlaceholder: 'Enter password',
    confirmClose: 'Confirm closing',
    loginRequiredTitle: 'Login required',
    loginRequiredMessage: 'Enter email and password to enable kiosk mode.',
    kioskReleasedTitle: 'Kiosk enabled',
    kioskReleasedMessage: 'Login successful. Check-in is ready to use.',
    loginErrorTitle: 'Sign-in error',
    loginErrorMessage: 'Could not authenticate this user.',
    confirmNeededTitle: 'Confirmation required',
    confirmNeededMessage: 'Enter the authenticated user password to close the kiosk.',
    kioskClosedTitle: 'Kiosk closed',
    kioskClosedMessage: 'Check-in was disabled on this browser.',
    wrongPasswordTitle: 'Wrong password',
    wrongPasswordMessage: 'Could not close the kiosk with the provided password.',
    sessionExpiredTitle: 'Session expired',
    sessionExpiredMessageCheckIn: 'Sign in again to continue using this branch check-in.',
    sessionExpiredMessageTotem: 'Sign in again to continue using the kiosk.',
    invalidCpfTitle: 'Invalid CPF',
    invalidCpfMessage: 'Enter a valid CPF to find your record.',
    branchMissingTitle: 'Branch not identified',
    branchMissingMessage: 'This kiosk must be linked to a valid branch.',
    lookupErrorTitle: 'Record lookup error',
    lookupErrorMessage: 'Could not find your record with the provided CPF.',
    faceRegisterDoneMessageQueued: 'Facial registration completed. You were already sent to the reception queue.',
    faceRegisterDoneMessageDefault: 'Facial registration completed successfully.',
    faceRegisterDoneTitle: 'Facial registration completed',
    faceRegisterDoneToast: 'Your face was registered successfully.',
    faceRegisterErrorTitle: 'Face registration error',
    faceRegisterErrorMessage: 'Could not complete facial registration.',
    kioskUrlMissing: 'Kiosk URL has no configured branch.',
    branchLookupError: 'Could not identify the configured branch.',
    kioskNeedsBranch: 'This kiosk must be accessed with a branch configured in the URL.',
    checkInDisabledError: 'Public check-in is currently disabled for this branch.',
    faceNotRecognizedError: 'We could not recognize your face with enough confidence.',
    checkInGenericError: 'Could not complete check-in. Please try again or contact reception.',
    statusMessageQueued: 'Check-in completed successfully. Patient sent to the reception queue.',
    statusMessageNoConfirmed: 'Patient recognized, but there is no confirmed appointment for today.',
    statusMessagePatientNotFound: 'Patient not found for this branch.',
    statusMessageFaceNotRecognized: 'We could not recognize your face with enough confidence.',
  },
  'es-ES': {
    languageLabel: 'Idioma',
    languagePt: 'Portugués (BR)',
    languageEn: 'Inglés',
    languageEs: 'Español',
    languageFr: 'Francés',
    statusQueued: 'En la fila de atención',
    statusNoConfirmed: 'Sin cita confirmada',
    statusPatientNotFound: 'Paciente no encontrado',
    statusFaceNotRecognized: 'Rostro no reconocido',
    titleCheckInArrival: 'Check-in de llegada',
    titleEnterKiosk: 'Entrar en modo tótem',
    subtitleCheckInArrival: 'Coloque su rostro frente a la cámara para identificarle y localizar su atención de hoy.',
    subtitleEnterKiosk: 'Use el inicio de sesión de la clínica para habilitar este tótem, mantener la operación auditable y liberar el check-in de la sucursal.',
    loginEmailLabel: 'Correo del usuario',
    loginEmailPlaceholder: 'usuario@clinica.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Ingrese su contraseña',
    loginButton: 'Iniciar sesión y activar tótem',
    kioskAuthenticated: 'Tótem autenticado',
    startFacial: 'Iniciar reconocimiento facial',
    firstTimeButton: '¿Primera vez? Registre su rostro',
    firstTimeTitle: 'Primer acceso al tótem',
    firstTimeDescription: 'Ingrese su CPF para localizar su registro y registrar su rostro por primera vez.',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    cancel: 'Cancelar',
    findRecord: 'Buscar registro',
    manualFallbackHint: 'Si no podemos identificarle, recepción puede continuar la atención manualmente.',
    blockedHint: 'Sin inicio de sesión, el tótem permanece bloqueado y el check-in no está disponible.',
    resultTitle: 'Resultado del check-in',
    branchConfigured: 'Sucursal configurada',
    branchLoading: 'Cargando sucursal...',
    branchNotIdentified: 'No se pudo identificar la sucursal configurada.',
    resultNeedsLogin: 'Inicie sesión con un usuario de la clínica para habilitar el check-in de esta sucursal.',
    closeKiosk: 'Cerrar tótem',
    kioskLockedTitle: 'Tótem bloqueado hasta autenticación',
    kioskLockedDescription: 'El check-in de esta sucursal ahora requiere inicio de sesión de un usuario de la clínica. Después, la operación queda auditable y el tótem puede cerrarse con logout.',
    checkInOffTitle: 'Check-in desactivado para esta sucursal',
    checkInOffDescription: 'Esta URL es correcta, pero el check-in público aún debe activarse en la configuración de la sucursal.',
    waitingTitle: 'Esperando identificación',
    waitingDescription: 'Cuando termine el reconocimiento facial, mostraremos aquí si ya fue enviado a la fila de recepción.',
    unknownPatient: 'No pudimos identificarle',
    cpfPrefix: 'CPF',
    faceRetryHint: 'Puede intentarlo de nuevo con mejor iluminación o acudir a recepción para identificación manual.',
    trustPrefix: 'Confianza del reconocimiento',
    appointmentsTodayTitle: 'Citas encontradas hoy',
    scheduledFallback: 'Agendado',
    procedureFallback: 'Procedimiento',
    doctorFallback: 'Profesional no informado',
    insurancePrefix: 'Seguro',
    facialRegisterTitle: 'Registro facial del paciente',
    facialRecognitionTitle: 'Reconocimiento facial de llegada',
    facialRegisterDescription: 'Coloque su rostro en el centro de la cámara para completar el registro facial.',
    facialRecognitionDescription: 'Coloque su rostro en el centro de la cámara. Validaremos su identidad y localizaremos su atención de hoy.',
    closeKioskModalTitle: 'Cerrar tótem',
    closeKioskModalText: 'Para evitar apagados accidentales, confirme la contraseña del usuario autenticado antes de cerrar este tótem.',
    userPasswordLabel: 'Contraseña del usuario',
    userPasswordPlaceholder: 'Ingrese la contraseña',
    confirmClose: 'Confirmar cierre',
    loginRequiredTitle: 'Inicio de sesión necesario',
    loginRequiredMessage: 'Ingrese correo y contraseña para activar el modo tótem.',
    kioskReleasedTitle: 'Tótem habilitado',
    kioskReleasedMessage: 'Inicio de sesión exitoso. El check-in ya está listo.',
    loginErrorTitle: 'Error al iniciar sesión',
    loginErrorMessage: 'No se pudo autenticar este usuario.',
    confirmNeededTitle: 'Confirmación necesaria',
    confirmNeededMessage: 'Ingrese la contraseña del usuario autenticado para cerrar el tótem.',
    kioskClosedTitle: 'Tótem cerrado',
    kioskClosedMessage: 'El check-in fue desactivado en este navegador.',
    wrongPasswordTitle: 'Contraseña incorrecta',
    wrongPasswordMessage: 'No se pudo cerrar el tótem con la contraseña informada.',
    sessionExpiredTitle: 'Sesión expirada',
    sessionExpiredMessageCheckIn: 'Inicie sesión nuevamente para seguir usando el check-in de esta sucursal.',
    sessionExpiredMessageTotem: 'Inicie sesión nuevamente para seguir usando el tótem.',
    invalidCpfTitle: 'CPF inválido',
    invalidCpfMessage: 'Ingrese un CPF válido para localizar su registro.',
    branchMissingTitle: 'Sucursal no identificada',
    branchMissingMessage: 'Este tótem debe estar vinculado a una sucursal válida.',
    lookupErrorTitle: 'Error al buscar registro',
    lookupErrorMessage: 'No fue posible localizar su registro con el CPF informado.',
    faceRegisterDoneMessageQueued: 'Registro facial completado con éxito. Ya fue enviado a la fila de recepción.',
    faceRegisterDoneMessageDefault: 'Registro facial completado con éxito.',
    faceRegisterDoneTitle: 'Registro facial completado',
    faceRegisterDoneToast: 'Su rostro fue registrado con éxito.',
    faceRegisterErrorTitle: 'Error al registrar rostro',
    faceRegisterErrorMessage: 'No se pudo completar el registro facial.',
    kioskUrlMissing: 'La URL del tótem no tiene sucursal configurada.',
    branchLookupError: 'No se pudo identificar la sucursal configurada.',
    kioskNeedsBranch: 'Este tótem debe abrirse con una sucursal configurada en la URL.',
    checkInDisabledError: 'El check-in público de esta sucursal está desactivado por el momento.',
    faceNotRecognizedError: 'No pudimos reconocer su rostro con confianza suficiente.',
    checkInGenericError: 'No fue posible completar el check-in. Intente de nuevo o busque recepción.',
    statusMessageQueued: 'Check-in completado con éxito. Paciente enviado a la fila de recepción.',
    statusMessageNoConfirmed: 'Paciente reconocido, pero sin cita confirmada para hoy.',
    statusMessagePatientNotFound: 'Paciente no encontrado para esta sucursal.',
    statusMessageFaceNotRecognized: 'No pudimos reconocer su rostro con confianza suficiente.',
  },
  'fr-FR': {
    languageLabel: 'Langue',
    languagePt: 'Portugais (BR)',
    languageEn: 'Anglais',
    languageEs: 'Espagnol',
    languageFr: 'Français',
    statusQueued: 'Dans la file d’accueil',
    statusNoConfirmed: 'Aucun rendez-vous confirmé',
    statusPatientNotFound: 'Patient introuvable',
    statusFaceNotRecognized: 'Visage non reconnu',
    titleCheckInArrival: 'Check-in d’arrivée',
    titleEnterKiosk: 'Entrer en mode borne',
    subtitleCheckInArrival: 'Positionnez votre visage devant la caméra pour vous identifier et retrouver votre rendez-vous du jour.',
    subtitleEnterKiosk: 'Utilisez le login de la clinique pour activer cette borne, garder l’opération traçable et libérer le check-in de l’unité.',
    loginEmailLabel: 'Email utilisateur',
    loginEmailPlaceholder: 'utilisateur@clinique.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Saisissez votre mot de passe',
    loginButton: 'Se connecter et activer la borne',
    kioskAuthenticated: 'Borne authentifiée',
    startFacial: 'Démarrer la reconnaissance faciale',
    firstTimeButton: 'Première fois ? Enregistrez votre visage',
    firstTimeTitle: 'Premier accès à la borne',
    firstTimeDescription: 'Saisissez votre CPF pour retrouver votre dossier et enregistrer votre visage.',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    cancel: 'Annuler',
    findRecord: 'Rechercher le dossier',
    manualFallbackHint: 'Si nous ne pouvons pas vous identifier, l’accueil pourra poursuivre manuellement.',
    blockedHint: 'Sans connexion, la borne reste bloquée et le check-in n’est pas disponible.',
    resultTitle: 'Résultat du check-in',
    branchConfigured: 'Unité configurée',
    branchLoading: 'Chargement de l’unité...',
    branchNotIdentified: 'Impossible d’identifier l’unité configurée.',
    resultNeedsLogin: 'Connectez-vous avec un utilisateur de la clinique pour activer le check-in de cette unité.',
    closeKiosk: 'Fermer la borne',
    kioskLockedTitle: 'Borne bloquée jusqu’à authentification',
    kioskLockedDescription: 'Le check-in de cette unité exige désormais un login utilisateur. Après connexion, le flux reste traçable et la borne peut être fermée via logout.',
    checkInOffTitle: 'Check-in désactivé pour cette unité',
    checkInOffDescription: 'Cette URL est correcte, mais le check-in public doit encore être activé dans les paramètres de l’unité.',
    waitingTitle: 'En attente d’identification',
    waitingDescription: 'Dès la fin de la reconnaissance faciale, nous afficherons ici si vous avez été envoyé dans la file d’accueil.',
    unknownPatient: 'Nous n’avons pas pu vous identifier',
    cpfPrefix: 'CPF',
    faceRetryHint: 'Vous pouvez réessayer avec un meilleur éclairage ou aller à l’accueil pour une identification manuelle.',
    trustPrefix: 'Confiance de reconnaissance',
    appointmentsTodayTitle: 'Rendez-vous trouvés aujourd’hui',
    scheduledFallback: 'Planifié',
    procedureFallback: 'Procédure',
    doctorFallback: 'Professionnel non renseigné',
    insurancePrefix: 'Assurance',
    facialRegisterTitle: 'Enregistrement facial du patient',
    facialRecognitionTitle: 'Reconnaissance faciale d’arrivée',
    facialRegisterDescription: 'Positionnez votre visage au centre de la caméra pour terminer l’enregistrement facial.',
    facialRecognitionDescription: 'Positionnez votre visage au centre de la caméra. Nous allons valider votre identité et retrouver votre rendez-vous du jour.',
    closeKioskModalTitle: 'Fermer la borne',
    closeKioskModalText: 'Pour éviter une fermeture accidentelle, confirmez le mot de passe de l’utilisateur authentifié.',
    userPasswordLabel: 'Mot de passe utilisateur',
    userPasswordPlaceholder: 'Saisissez le mot de passe',
    confirmClose: 'Confirmer la fermeture',
    loginRequiredTitle: 'Connexion requise',
    loginRequiredMessage: 'Saisissez email et mot de passe pour activer le mode borne.',
    kioskReleasedTitle: 'Borne activée',
    kioskReleasedMessage: 'Connexion réussie. Le check-in est prêt à l’usage.',
    loginErrorTitle: 'Erreur de connexion',
    loginErrorMessage: 'Impossible d’authentifier cet utilisateur.',
    confirmNeededTitle: 'Confirmation requise',
    confirmNeededMessage: 'Saisissez le mot de passe de l’utilisateur authentifié pour fermer la borne.',
    kioskClosedTitle: 'Borne fermée',
    kioskClosedMessage: 'Le check-in a été désactivé dans ce navigateur.',
    wrongPasswordTitle: 'Mot de passe incorrect',
    wrongPasswordMessage: 'Impossible de fermer la borne avec le mot de passe saisi.',
    sessionExpiredTitle: 'Session expirée',
    sessionExpiredMessageCheckIn: 'Connectez-vous de nouveau pour continuer le check-in de cette unité.',
    sessionExpiredMessageTotem: 'Connectez-vous de nouveau pour continuer sur la borne.',
    invalidCpfTitle: 'CPF invalide',
    invalidCpfMessage: 'Saisissez un CPF valide pour retrouver votre dossier.',
    branchMissingTitle: 'Unité non identifiée',
    branchMissingMessage: 'Cette borne doit être liée à une unité valide.',
    lookupErrorTitle: 'Erreur de recherche',
    lookupErrorMessage: 'Impossible de localiser votre dossier avec le CPF saisi.',
    faceRegisterDoneMessageQueued: 'Enregistrement facial terminé. Vous avez déjà été envoyé dans la file d’accueil.',
    faceRegisterDoneMessageDefault: 'Enregistrement facial terminé avec succès.',
    faceRegisterDoneTitle: 'Enregistrement facial terminé',
    faceRegisterDoneToast: 'Votre visage a été enregistré avec succès.',
    faceRegisterErrorTitle: 'Erreur d’enregistrement facial',
    faceRegisterErrorMessage: 'Impossible de terminer l’enregistrement facial.',
    kioskUrlMissing: 'URL de la borne sans unité configurée.',
    branchLookupError: 'Impossible d’identifier l’unité configurée.',
    kioskNeedsBranch: 'Cette borne doit être ouverte avec une unité configurée dans l’URL.',
    checkInDisabledError: 'Le check-in public de cette unité est désactivé pour le moment.',
    faceNotRecognizedError: 'Nous n’avons pas pu reconnaître votre visage avec une confiance suffisante.',
    checkInGenericError: 'Impossible de terminer le check-in. Réessayez ou contactez l’accueil.',
    statusMessageQueued: 'Check-in effectué avec succès. Patient envoyé dans la file d’accueil.',
    statusMessageNoConfirmed: 'Patient reconnu, mais aucun rendez-vous confirmé pour aujourd’hui.',
    statusMessagePatientNotFound: 'Patient introuvable pour cette unité.',
    statusMessageFaceNotRecognized: 'Nous n’avons pas pu reconnaître votre visage avec une confiance suffisante.',
  },
};

const formatCpf = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '-';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const statusConfig: Record<string, { color: string }> = {
  QUEUED: { color: 'green' },
  NO_CONFIRMED_APPOINTMENTS: { color: 'yellow' },
  PATIENT_NOT_FOUND: { color: 'red' },
  FACIAL_NOT_RECOGNIZED: { color: 'red' },
};

export function PublicCheckIn() {
  const { branchId: branchIdParam } = useParams();
  const branchId = branchIdParam || '';
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<UiLanguage>(() => {
    if (typeof window === 'undefined') return 'pt-BR';
    const saved = window.localStorage.getItem(TOTEM_LANGUAGE_KEY) as UiLanguage | null;
    if (saved === 'pt-BR' || saved === 'en-US' || saved === 'es-ES' || saved === 'fr-FR') return saved;
    return 'pt-BR';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => publicCheckInSessionService.isAuthenticated());
  const [currentUserName, setCurrentUserName] = useState(() => publicCheckInSessionService.getCurrentUser()?.name || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<FacialScanResponse | null>(null);
  const [checkInResult, setCheckInResult] = useState<PublicCheckInResponse | null>(null);
  const [branchLookupError, setBranchLookupError] = useState<string | null>(null);
  const [firstTimeMode, setFirstTimeMode] = useState(false);
  const [firstTimeCpf, setFirstTimeCpf] = useState('');
  const [firstTimeLookupLoading, setFirstTimeLookupLoading] = useState(false);
  const [firstTimeRegistering, setFirstTimeRegistering] = useState(false);
  const [pendingFirstTimeCheckIn, setPendingFirstTimeCheckIn] = useState<PublicCheckInResponse | null>(null);
  const { data: branchInfo, error: branchInfoError, isLoading: branchInfoLoading } = usePublicBranchInfoQuery(branchId, isAuthenticated);
  const t = UI_COPY[language];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOTEM_LANGUAGE_KEY, language);
  }, [language]);

  const currentStatus = useMemo(() => {
    const status = checkInResult?.status || '';
    const config = statusConfig[status];
    if (!config) return null;
    if (status === 'QUEUED') return { ...config, label: t.statusQueued };
    if (status === 'NO_CONFIRMED_APPOINTMENTS') return { ...config, label: t.statusNoConfirmed };
    if (status === 'PATIENT_NOT_FOUND') return { ...config, label: t.statusPatientNotFound };
    if (status === 'FACIAL_NOT_RECOGNIZED') return { ...config, label: t.statusFaceNotRecognized };
    return { ...config, label: status };
  }, [checkInResult, t]);

  const localizedCheckInMessage = useMemo(() => {
    if (!checkInResult?.status) return checkInResult?.message || '';
    if (checkInResult.status === 'QUEUED') return t.statusMessageQueued;
    if (checkInResult.status === 'NO_CONFIRMED_APPOINTMENTS') return t.statusMessageNoConfirmed;
    if (checkInResult.status === 'PATIENT_NOT_FOUND') return t.statusMessagePatientNotFound;
    if (checkInResult.status === 'FACIAL_NOT_RECOGNIZED') return t.statusMessageFaceNotRecognized;
    return checkInResult.message || '';
  }, [checkInResult, t]);

  const resetFlow = () => {
    setRecognitionResult(null);
    setCheckInResult(null);
    setFirstTimeMode(false);
    setFirstTimeCpf('');
    setPendingFirstTimeCheckIn(null);
  };

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(publicCheckInSessionService.isAuthenticated());
      setCurrentUserName(publicCheckInSessionService.getCurrentUser()?.name || '');
    };

    syncAuthState();
    const eventName = publicCheckInSessionService.getAuthChangedEventName();
    window.addEventListener(eventName, syncAuthState);
    return () => window.removeEventListener(eventName, syncAuthState);
  }, []);

  useEffect(() => {
    if (!checkInResult) return;

    const timer = window.setTimeout(() => {
      resetFlow();
    }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkInResult]);

  useEffect(() => {
    if (!branchId) {
      setBranchLookupError(t.kioskUrlMissing);
      return;
    }
    if (!isAuthenticated) {
      setBranchLookupError(null);
      return;
    }
    if (!branchInfoError) {
      setBranchLookupError(null);
      return;
    }
    const error: any = branchInfoError;
    setBranchLookupError(resolveApiErrorMessage(error, t.branchLookupError));
  }, [branchId, branchInfoError, isAuthenticated, t]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      showNotification({
        title: t.loginRequiredTitle,
        message: t.loginRequiredMessage,
        color: 'yellow',
      });
      return;
    }

    setLoginLoading(true);
    try {
      await publicCheckInSessionService.login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      setLoginPassword('');
      setIsAuthenticated(true);
      setCurrentUserName(publicCheckInSessionService.getCurrentUser()?.name || '');
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
      showNotification({
        title: t.kioskReleasedTitle,
        message: t.kioskReleasedMessage,
        color: 'green',
      });
    } catch (error: any) {
      showNotification({
        title: t.loginErrorTitle,
      message: resolveApiErrorMessage(error, t.loginErrorMessage),
        color: 'red',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const completeLogout = async () => {
    publicCheckInSessionService.logout();
    setIsAuthenticated(false);
    setCurrentUserName('');
    setLoginPassword('');
    setLogoutPassword('');
    setRecognitionResult(null);
    setCheckInResult(null);
    setPendingFirstTimeCheckIn(null);
    await queryClient.removeQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
  };

  const handleLogout = async () => {
    const currentUser = publicCheckInSessionService.getCurrentUser();
    if (!currentUser?.email || !logoutPassword) {
      showNotification({
        title: t.confirmNeededTitle,
        message: t.confirmNeededMessage,
        color: 'yellow',
      });
      return;
    }

    setLogoutLoading(true);
    try {
      await publicCheckInSessionService.login({
        email: currentUser.email,
        password: logoutPassword,
      });
      await completeLogout();
      setLogoutModalOpen(false);
      showNotification({
        title: t.kioskClosedTitle,
        message: t.kioskClosedMessage,
        color: 'green',
      });
    } catch {
      showNotification({
        title: t.wrongPasswordTitle,
        message: t.wrongPasswordMessage,
        color: 'red',
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleFacialScan = async (imageBase64: string) => {
    if (!branchId) {
      setCheckInResult({
        status: 'PATIENT_NOT_FOUND',
        message: t.kioskNeedsBranch,
      });
      return;
    }

    setProcessing(true);
    try {
      const recognized = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: branchId,
        skipAuth: true,
      });
      setRecognitionResult(recognized);

      const checkIn = await publicCheckInService.facialCheckIn({
        branchId,
        patientId: recognized.patient?.id,
        patientCpf: recognized.patient?.cpf,
        patientName: recognized.patient?.name,
        trust: recognized.trust,
        totem: 1,
      });

      setCheckInResult(checkIn);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
    } catch (error: any) {
      const responseData = error?.response?.data;
      if (error?.response?.status === 401) {
        publicCheckInSessionService.logout();
        setIsAuthenticated(false);
        setCurrentUserName('');
        setCheckInResult(null);
        showNotification({
          title: t.sessionExpiredTitle,
          message: t.sessionExpiredMessageCheckIn,
          color: 'yellow',
        });
        return;
      }
      const fallbackStatus = responseData?.status as PublicCheckInResponse['status'] | undefined;
      if (fallbackStatus) {
        setCheckInResult(responseData);
      } else if (responseData?.code === 'PUBLIC_CHECKIN_DISABLED') {
        setCheckInResult({
          status: 'PATIENT_NOT_FOUND',
          message: responseData?.error || t.checkInDisabledError,
        });
      } else if (responseData?.detail) {
        setRecognitionResult(null);
        setCheckInResult({
          status: 'FACIAL_NOT_RECOGNIZED',
          message: responseData.detail || t.faceNotRecognizedError,
        });
      } else {
        setCheckInResult({
          status: 'PATIENT_NOT_FOUND',
          message: responseData?.message || error?.message || t.checkInGenericError,
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleStartFirstTimeFlow = () => {
    setRecognitionResult(null);
    setCheckInResult(null);
    setPendingFirstTimeCheckIn(null);
    setFirstTimeCpf('');
    setFirstTimeMode(true);
  };

  const handleCancelFirstTimeFlow = () => {
    setFirstTimeMode(false);
    setFirstTimeCpf('');
    setPendingFirstTimeCheckIn(null);
  };

  const handleFirstTimeLookup = async () => {
    const cpfDigits = onlyDigits(firstTimeCpf);
    if (cpfDigits.length !== 11) {
      showNotification({
        title: t.invalidCpfTitle,
        message: t.invalidCpfMessage,
        color: 'yellow',
      });
      return;
    }

    if (!branchId) {
      showNotification({
        title: t.branchMissingTitle,
        message: t.branchMissingMessage,
        color: 'red',
      });
      return;
    }

    setFirstTimeLookupLoading(true);
    try {
      const lookup = await publicCheckInService.facialCheckIn({
        branchId,
        patientCpf: cpfDigits,
        totem: 1,
      });

      if (!lookup.patient?.id || !lookup.patient?.cpf || !lookup.patient?.name) {
        setCheckInResult(lookup);
        return;
      }

      setPendingFirstTimeCheckIn(lookup);
      setFacialCaptureOpen(true);
    } catch (error: any) {
      const responseData = error?.response?.data;
      if (error?.response?.status === 401) {
        publicCheckInSessionService.logout();
        setIsAuthenticated(false);
        setCurrentUserName('');
        showNotification({
          title: t.sessionExpiredTitle,
          message: t.sessionExpiredMessageTotem,
          color: 'yellow',
        });
        return;
      }
      if (responseData?.status) {
        setCheckInResult(responseData);
      } else {
        showNotification({
          title: t.lookupErrorTitle,
          message: responseData?.message || error?.message || t.lookupErrorMessage,
          color: 'red',
        });
      }
    } finally {
      setFirstTimeLookupLoading(false);
    }
  };

  const handleFirstTimeCapture = async (imageBase64: string) => {
    if (!branchId || !pendingFirstTimeCheckIn?.patient) return;

    setFirstTimeRegistering(true);
    try {
      await facialRecognitionService.registerFace({
        image: imageBase64,
        cpf: onlyDigits(pendingFirstTimeCheckIn.patient.cpf),
        nome: pendingFirstTimeCheckIn.patient.name,
        parentesco: 'próprio',
        id_unidade: branchId,
        id_medilab: pendingFirstTimeCheckIn.patient.id,
      });

      setCheckInResult({
        ...pendingFirstTimeCheckIn,
        message: pendingFirstTimeCheckIn.status === 'QUEUED'
          ? t.faceRegisterDoneMessageQueued
          : pendingFirstTimeCheckIn.message || t.faceRegisterDoneMessageDefault,
      });
      setFirstTimeMode(false);
      setFirstTimeCpf('');
      setPendingFirstTimeCheckIn(null);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
      showNotification({
        title: t.faceRegisterDoneTitle,
        message: t.faceRegisterDoneToast,
        color: 'green',
      });
    } catch (error: any) {
      showNotification({
        title: t.faceRegisterErrorTitle,
      message: resolveApiErrorMessage(error, t.faceRegisterErrorMessage),
        color: 'red',
      });
      setFacialCaptureOpen(true);
    } finally {
      setFirstTimeRegistering(false);
    }
  };

  const checkInDisabled = isAuthenticated && branchInfo && !branchInfo.publicCheckInEnabled;

  return (
    <Box bg={DARK_SURFACE} style={{ minHeight: '100vh' }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ minHeight: '100vh' }}>
        <Center p={{ base: 'xl', md: 48 }} bg="#0A1128">
          <Stack align="center" gap="xl" maw={520} w="100%">
            <Stack gap={6} w="100%">
              <Text c="white" fw={600} size="sm">{t.languageLabel}</Text>
              <Group gap="xs" wrap="wrap">
                <Button
                  size="xs"
                  radius="xl"
                  variant={language === 'pt-BR' ? 'filled' : 'light'}
                  color={language === 'pt-BR' ? 'blue' : 'gray'}
                  onClick={() => setLanguage('pt-BR')}
                >
                  🇧🇷 {t.languagePt}
                </Button>
                <Button
                  size="xs"
                  radius="xl"
                  variant={language === 'en-US' ? 'filled' : 'light'}
                  color={language === 'en-US' ? 'blue' : 'gray'}
                  onClick={() => setLanguage('en-US')}
                >
                  🇺🇸 {t.languageEn}
                </Button>
                <Button
                  size="xs"
                  radius="xl"
                  variant={language === 'es-ES' ? 'filled' : 'light'}
                  color={language === 'es-ES' ? 'blue' : 'gray'}
                  onClick={() => setLanguage('es-ES')}
                >
                  🇪🇸 {t.languageEs}
                </Button>
                <Button
                  size="xs"
                  radius="xl"
                  variant={language === 'fr-FR' ? 'filled' : 'light'}
                  color={language === 'fr-FR' ? 'blue' : 'gray'}
                  onClick={() => setLanguage('fr-FR')}
                >
                  🇫🇷 {t.languageFr}
                </Button>
              </Group>
            </Stack>

            <ThemeIcon size={88} radius="xl" color="blue" variant="light">
              {isAuthenticated ? <Camera size={40} /> : <ShieldCheck size={40} />}
            </ThemeIcon>

            <Stack align="center" gap="xs">
              <Title order={1} c="white" ta="center">
                {isAuthenticated ? t.titleCheckInArrival : t.titleEnterKiosk}
              </Title>
              <Text c="rgba(255,255,255,0.72)" ta="center" size="lg">
                {isAuthenticated
                  ? t.subtitleCheckInArrival
                  : t.subtitleEnterKiosk}
              </Text>
            </Stack>

            {!isAuthenticated ? (
              <Paper
                radius="xl"
                p="lg"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', width: '100%' }}
              >
                <Stack gap="md">
                  <TextInput
                    label={t.loginEmailLabel}
                    type="email"
                    labelProps={{ style: { color: 'white' } }}
                    placeholder={t.loginEmailPlaceholder}
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(normalizeEmail(event.currentTarget.value))}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <PasswordInput
                    label={t.passwordLabel}
                    labelProps={{ style: { color: 'white' } }}
                    placeholder={t.passwordPlaceholder}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.currentTarget.value)}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <Button
                    size="xl"
                    radius="xl"
                    leftSection={<LogIn size={20} />}
                    onClick={handleLogin}
                    loading={loginLoading}
                    fullWidth
                  >
                    {t.loginButton}
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <>
                <Badge size="lg" radius="sm" color="green" variant="light">
                  {t.kioskAuthenticated}{currentUserName ? ` • ${currentUserName}` : ''}
                </Badge>

                <Button
                  size="xl"
                  radius="xl"
                  leftSection={<Camera size={22} />}
                  onClick={() => setFacialCaptureOpen(true)}
                  loading={processing}
                  fullWidth
                  disabled={firstTimeLookupLoading || firstTimeRegistering || Boolean(checkInDisabled)}
                >
                  {t.startFacial}
                </Button>

                <Button
                  size="md"
                  radius="xl"
                  variant="light"
                  color="blue"
                  leftSection={<Camera size={18} />}
                  onClick={handleStartFirstTimeFlow}
                  disabled={processing || firstTimeLookupLoading || firstTimeRegistering || Boolean(checkInDisabled)}
                  fullWidth
                  styles={{
                    root: {
                      border: '1px solid rgba(120, 148, 255, 0.42)',
                    },
                  }}
                >
                  {t.firstTimeButton}
                </Button>
              </>
            )}

            {isAuthenticated && firstTimeMode && (
              <Paper
                radius="xl"
                p="lg"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', width: '100%' }}
              >
                <Stack gap="sm">
                  <Box>
                    <Text c="white" fw={700}>
                      {t.firstTimeTitle}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {t.firstTimeDescription}
                    </Text>
                  </Box>

                  <TextInput
                    label={t.cpfLabel}
                    labelProps={{ style: { color: 'white' } }}
                    placeholder={t.cpfPlaceholder}
                    value={firstTimeCpf}
                    onChange={(event) => setFirstTimeCpf(formatCpf(event.currentTarget.value))}
                    maxLength={14}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <Group justify="space-between">
                    <Button variant="subtle" color="gray" onClick={handleCancelFirstTimeFlow}>
                      {t.cancel}
                    </Button>
                    <Button onClick={handleFirstTimeLookup} loading={firstTimeLookupLoading}>
                      {t.findRecord}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Text c="rgba(255,255,255,0.6)" size="sm" ta="center">
              {isAuthenticated
                ? t.manualFallbackHint
                : t.blockedHint}
            </Text>
          </Stack>
        </Center>

        <Box p={{ base: 'xl', md: 48 }} bg={DARK_SURFACE}>
          <Stack gap="lg" maw={640} mx="auto">
            <Group justify="space-between" align="center">
              <Box>
                <Text c="white" fw={700} size="xl">
                  {t.resultTitle}
                </Text>
                <Text c="dimmed">
                  {!isAuthenticated
                    ? t.resultNeedsLogin
                    : branchInfo?.tradeName
                    ? `${t.branchConfigured}: ${branchInfo.tradeName}`
                    : branchInfoLoading
                      ? t.branchLoading
                      : branchLookupError || t.branchNotIdentified}
                </Text>
              </Box>

              <Group gap="sm">
                {isAuthenticated && (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<LogOut size={16} />}
                    onClick={() => {
                      setLogoutPassword('');
                      setLogoutModalOpen(true);
                    }}
                  >
                    {t.closeKiosk}
                  </Button>
                )}
                <ActionIcon variant="light" size="xl" onClick={resetFlow} disabled={processing}>
                  <RefreshCcw size={20} />
                </ActionIcon>
              </Group>
            </Group>

            {!isAuthenticated ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="blue" variant="light">
                      {loginLoading ? <Loader size={28} /> : <ShieldCheck size={32} />}
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      {t.kioskLockedTitle}
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      {t.kioskLockedDescription}
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : checkInDisabled ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="yellow" variant="light">
                      <CircleAlert size={32} />
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      {t.checkInOffTitle}
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      {t.checkInOffDescription}
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : !checkInResult ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="blue" variant="light">
                      <ClipboardCheck size={32} />
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      {t.waitingTitle}
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      {t.waitingDescription}
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <>
                <Paper
                  radius="xl"
                  p="xl"
                  withBorder
                  bg={CARD_SURFACE}
                  style={{ borderColor: 'rgba(120, 148, 255, 0.24)' }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="md" align="center">
                        <ThemeIcon size={64} radius="xl" color={currentStatus?.color || 'gray'} variant="light">
                          {checkInResult.status === 'QUEUED' ? <UserRoundCheck size={30} /> : <CircleAlert size={30} />}
                        </ThemeIcon>
                        <Box>
                          <Text c="white" fw={700} size="xl">
                            {checkInResult.patient?.name || recognitionResult?.patient?.name || t.unknownPatient}
                          </Text>
                          {(checkInResult.patient?.cpf || recognitionResult?.patient?.cpf) && (
                            <Text c="dimmed">{t.cpfPrefix}: {formatCpf(checkInResult.patient?.cpf || recognitionResult?.patient?.cpf)}</Text>
                          )}
                        </Box>
                      </Group>

                      {currentStatus && (
                        <Badge color={currentStatus.color} variant="light" size="lg">
                          {currentStatus.label}
                        </Badge>
                      )}
                    </Group>

                    <Text c="white" size="lg">
                      {localizedCheckInMessage || checkInResult.message}
                    </Text>

                    {checkInResult.status === 'FACIAL_NOT_RECOGNIZED' && (
                      <Text c="dimmed" size="sm">
                        {t.faceRetryHint}
                      </Text>
                    )}

                    {recognitionResult?.trust !== undefined && (
                      <Text c="dimmed" size="sm">
                        {t.trustPrefix}: {(recognitionResult.trust * 100).toFixed(1)}%
                      </Text>
                    )}
                  </Stack>
                </Paper>

                {(checkInResult.appointments || []).length > 0 && (
                  <Stack gap="sm">
                    <Text c="white" fw={700} size="lg">
                      {t.appointmentsTodayTitle}
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      {(checkInResult.appointments || []).map((appointment) => (
                        <Card
                          key={appointment.id}
                          radius="xl"
                          p="lg"
                          withBorder
                          bg={CARD_SURFACE}
                          style={{ borderColor: 'rgba(120, 148, 255, 0.24)' }}
                        >
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text c="white" fw={700}>
                                {appointment.time || '--:--'}
                              </Text>
                              <Badge variant="light" color="blue">
                                {appointment.status || t.scheduledFallback}
                              </Badge>
                            </Group>

                            <Text c="white" fw={600}>
                              {appointment.specialty || t.procedureFallback}
                            </Text>
                            <Text c="dimmed">
                              {appointment.doctorName || t.doctorFallback}
                            </Text>
                            {appointment.convenio && (
                              <Text c="dimmed" size="sm">
                                {t.insurancePrefix}: {appointment.convenio}
                              </Text>
                            )}
                          </Stack>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Box>
      </SimpleGrid>

      <FacialCapture
        opened={facialCaptureOpen}
        onClose={() => setFacialCaptureOpen(false)}
        onCapture={pendingFirstTimeCheckIn ? handleFirstTimeCapture : handleFacialScan}
        title={pendingFirstTimeCheckIn ? t.facialRegisterTitle : t.facialRecognitionTitle}
        description={pendingFirstTimeCheckIn
          ? t.facialRegisterDescription
          : t.facialRecognitionDescription}
      />

      <Modal
        opened={logoutModalOpen}
        onClose={() => {
          if (logoutLoading) return;
          setLogoutModalOpen(false);
          setLogoutPassword('');
        }}
        title={t.closeKioskModalTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t.closeKioskModalText}
          </Text>

          <PasswordInput
            label={t.userPasswordLabel}
            placeholder={t.userPasswordPlaceholder}
            value={logoutPassword}
            onChange={(event) => setLogoutPassword(event.currentTarget.value)}
            disabled={logoutLoading}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setLogoutModalOpen(false);
                setLogoutPassword('');
              }}
              disabled={logoutLoading}
            >
              {t.cancel}
            </Button>
            <Button color="red" onClick={handleLogout} loading={logoutLoading}>
              {t.confirmClose}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
