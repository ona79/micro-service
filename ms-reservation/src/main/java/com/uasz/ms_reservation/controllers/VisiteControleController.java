package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.BilletDto;
import com.uasz.ms_reservation.dto.ValidationBilletRequest;
import com.uasz.ms_reservation.dto.ValidationBilletResponse;
import com.uasz.ms_reservation.services.IReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visites")
@RequiredArgsConstructor
public class VisiteControleController {

    private final IReservationService reservationService;

    @PostMapping("/valider")
    public ResponseEntity<ValidationBilletResponse> validerBillet(
            @Valid @RequestBody ValidationBilletRequest request
    ) {
        ValidationBilletResponse response = reservationService.validerBillet(request.getTokenQr());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verifier")
    public ResponseEntity<BilletDto> verifierBillet(
            @RequestParam("tokenQr") String tokenQr
    ) {
        BilletDto response = reservationService.verifierBillet(tokenQr);
        return ResponseEntity.ok(response);
    }
}
