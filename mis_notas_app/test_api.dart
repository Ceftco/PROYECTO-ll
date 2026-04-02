// ignore_for_file: avoid_print

import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  print("====================");
  print(" INICIANDO PRUEBA");
  print("====================\n");

  const baseUrl = 'http://10.0.2.2:3000';
  final String testUser =
      'flutter_user_${DateTime.now().millisecondsSinceEpoch}';
  final String testPassword = 'mi_password_seguro';

  // 1. Probar Registro
  print("--- 1. PROBANDO REGISTRO ---");
  print("Registrando usuario: $testUser");

  final registerUrl = Uri.parse('$baseUrl/auth/register');
  try {
    final resReg = await http.post(
      registerUrl,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'nombre': testUser, 'password': testPassword}),
    );
    print("Codigo de estado: ${resReg.statusCode}");
    print("Respuesta del servidor: ${resReg.body}");

    if (resReg.statusCode == 200) {
      print(" REGISTRO EXITOSO\n");
    } else {
      print(" FALLO EL REGISTRO\n");
      return;
    }
  } catch (e) {
    print("ERROR DE CONEXION: $e");
    print(
      "Asegurate de que el servidor Node.js este corriendo en http://10.0.2.2:3000\n",
    );
    return;
  }

  // 2. Probar Login
  print("--- 2. PROBANDO LOGIN ---");
  print("Iniciando sesion con: $testUser");

  final loginUrl = Uri.parse('$baseUrl/auth/login');
  try {
    final resLogin = await http.post(
      loginUrl,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'nombre': testUser, 'password': testPassword}),
    );
    print("Codigo de estado: ${resLogin.statusCode}");
    print("Respuesta del servidor: ${resLogin.body}");

    if (resLogin.statusCode == 200) {
      final json = jsonDecode(resLogin.body);
      print("\n LOGIN EXITOSO. TU TOKEN ES:");
      print("🔑 ${json['token']}");
      print("====================================");
    } else {
      print(" FALLO EL LOGIN\n");
    }
  } catch (e) {
    print(" ERROR DE CONEXION: $e\n");
  }
}
